"""Populated editorial rollback and coordinated DB/media restore on a disposable DB."""
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
from tempfile import TemporaryDirectory

from PIL import Image

api=Path(__file__).resolve().parents[1]/'api'
with TemporaryDirectory(prefix='drzamani-editorial-') as directory:
    root=Path(directory);database=root/'editorial.db';media=root/'media';media.mkdir()
    key='a'*32;image=media/(key+'.webp');Image.new('RGB',(40,60),'teal').save(image,format='WEBP')
    digest=hashlib.sha256(image.read_bytes()).hexdigest()
    env=dict(os.environ,APP_ENV='test',APP_DEBUG='false',SMS_PROVIDER='disabled',BOOKING_ENABLED='false',DATABASE_URL=f'sqlite:///{database.as_posix()}',PUBLIC_MEDIA_DIR=str(media),UPLOAD_DIR=str(root/'private'))
    def migrate(operation,target):subprocess.run([sys.executable,'-m','alembic',operation,target],cwd=api,env=env,check=True)
    migrate('upgrade','head')
    snapshot=json.dumps(dict(title='Synthetic migration fixture',slug='fixture',body_html='<p>Synthetic</p>',cover_key=key),ensure_ascii=False)
    with closing(sqlite3.connect(database)) as db:
        db.execute('PRAGMA foreign_keys=ON')
        db.execute("INSERT INTO staff_users (id,username,full_name,password_hash,role,is_active,created_at,updated_at) VALUES (1,'editorial-fixture','Synthetic','not-a-login','custom',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        for i,status in enumerate(['draft','published','scheduled'],1):
            db.execute("INSERT INTO articles (id,slug,author_id,revision,content_json,status,published_slug,published_json,scheduled_json,scheduled_at,published_at,public_updated_at,deleted,created_at,updated_at) VALUES (?,?,1,3,?,?,?,?,?,'2099-01-01',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",(i,f'fixture-{i}',snapshot,status,f'published-{i}' if status=='published' else None,snapshot if status=='published' else None,snapshot if status=='scheduled' else None))
            db.execute("INSERT INTO article_revisions (article_id,revision,content_json,actor_id,action,created_at) VALUES (?,3,?,1,'edit',CURRENT_TIMESTAMP)",(i,snapshot))
        db.execute("INSERT INTO article_aliases (slug,article_id) VALUES ('old-fixture',2)")
        db.execute("INSERT INTO public_media (key,owner_id,alt,width,height,size,deleted,created_at) VALUES (?,1,'Synthetic',40,60,?,0,CURRENT_TIMESTAMP)",(key,image.stat().st_size))
        db.commit()
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
        with closing(sqlite3.connect(root/'backup.db')) as backup:db.backup(backup)
    shutil.copytree(media,root/'backup-media')
    migrate('downgrade','20261001_0017')
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT name FROM sqlite_master WHERE name IN ('articles','article_revisions','article_aliases','public_media')").fetchall()==[]
        assert db.execute('SELECT COUNT(*) FROM staff_users').fetchone()[0]==1
        assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
    assert hashlib.sha256(image.read_bytes()).hexdigest()==digest
    migrate('upgrade','head')
    with closing(sqlite3.connect(database)) as db:assert db.execute('SELECT COUNT(*) FROM articles').fetchone()[0]==0
    # Restore both parts while no API/jobs process is running; no live files are touched.
    with closing(sqlite3.connect(root/'backup.db')) as backup,closing(sqlite3.connect(database)) as db:backup.backup(db)
    shutil.copytree(root/'backup-media',media,dirs_exist_ok=True)
    with closing(sqlite3.connect(database)) as db:
        assert db.execute('SELECT status FROM articles ORDER BY id').fetchall()==[('draft',),('published',),('scheduled',)]
        assert db.execute('SELECT COUNT(*) FROM article_revisions').fetchone()[0]==3
        assert db.execute('SELECT article_id FROM article_aliases').fetchone()[0]==2
        assert db.execute('SELECT COUNT(*) FROM public_media').fetchone()[0]==1
        assert db.execute('SELECT version_num FROM alembic_version').fetchone()[0]=='20261001_0018'
        assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
    assert hashlib.sha256(image.read_bytes()).hexdigest()==digest
print('PASS: fresh editorial migration, populated draft/public/scheduled/history/alias/media rollback, file preservation, empty re-upgrade, coordinated DB/media restore, integrity and foreign keys.')
