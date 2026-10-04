"""Disposable populated comment rollback and coordinated DB/media backup restore."""
from contextlib import closing
import hashlib,json,os,shutil,sqlite3,subprocess,sys
from pathlib import Path
from tempfile import TemporaryDirectory
from PIL import Image

api=Path(__file__).resolve().parents[1]/'api'
with TemporaryDirectory(prefix='drzamani-comments-') as directory:
    root=Path(directory);database=root/'comments.db';media=root/'media';media.mkdir()
    env=dict(os.environ,APP_ENV='test',APP_DEBUG='false',SMS_PROVIDER='disabled',BOOKING_ENABLED='false',DATABASE_URL=f'sqlite:///{database.as_posix()}',PUBLIC_MEDIA_DIR=str(media),UPLOAD_DIR=str(root/'private'))
    def migrate(action,target):subprocess.run([sys.executable,'-m','alembic',action,target],cwd=api,env=env,check=True)
    migrate('upgrade','20261001_0018')
    with closing(sqlite3.connect(database)) as db:
        db.execute("INSERT INTO staff_users (id,username,full_name,password_hash,role,is_active,created_at,updated_at) VALUES (1,'comment-fixture','Synthetic','not-a-login','custom',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        db.execute("INSERT INTO articles (slug,author_id,revision,content_json,status,deleted,created_at,updated_at) VALUES ('preserved-article',1,1,'{}','draft',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
        db.commit()
    migrate('upgrade','head')
    key='b'*32;file=media/(key+'.webp');Image.new('RGB',(60,60),'teal').save(file,format='WEBP');digest=hashlib.sha256(file.read_bytes()).hexdigest()
    data=dict(display_name='Synthetic alias',body='Synthetic software fixture only',photo_key=key,photo_alt='Synthetic',service_id=None,sort_order=1,consent_received=True,consent_reference='private-fixture-reference',privacy_reviewed=True)
    public={k:v for k,v in data.items() if not k.startswith('consent') and k!='privacy_reviewed'};public['service_title']=''
    with closing(sqlite3.connect(database)) as db:
        assert db.execute('SELECT COUNT(*) FROM public_comments').fetchone()[0]==0
        db.execute("INSERT INTO public_media (key,owner_id,alt,width,height,size,deleted,created_at) VALUES (?,1,'Synthetic',60,60,?,0,CURRENT_TIMESTAMP)",(key,file.stat().st_size))
        for i,snapshot in enumerate([None,json.dumps(public)],1):
            db.execute("INSERT INTO public_comments (id,revision,content_json,published_json,deleted,actor_id,created_at,updated_at,published_at,public_updated_at) VALUES (?,2,?,?,0,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",(i,json.dumps(data),snapshot))
        db.commit()
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
        with closing(sqlite3.connect(root/'backup.db')) as backup:db.backup(backup)
    shutil.copytree(media,root/'media-backup')
    migrate('downgrade','20261001_0018')
    with closing(sqlite3.connect(database)) as db:
        assert db.execute("SELECT name FROM sqlite_master WHERE name='public_comments'").fetchall()==[]
        assert db.execute('SELECT COUNT(*) FROM articles').fetchone()[0]==1
        assert db.execute('SELECT COUNT(*) FROM public_media').fetchone()[0]==1
    assert hashlib.sha256(file.read_bytes()).hexdigest()==digest
    migrate('upgrade','head')
    with closing(sqlite3.connect(database)) as db:assert db.execute('SELECT COUNT(*) FROM public_comments').fetchone()[0]==0
    with closing(sqlite3.connect(root/'backup.db')) as backup,closing(sqlite3.connect(database)) as db:backup.backup(db)
    shutil.copytree(root/'media-backup',media,dirs_exist_ok=True)
    with closing(sqlite3.connect(database)) as db:
        assert db.execute('SELECT COUNT(*) FROM public_comments').fetchone()[0]==2
        assert db.execute('SELECT content_json FROM public_comments LIMIT 1').fetchone()[0]==json.dumps(data)
        assert db.execute('SELECT COUNT(*) FROM articles').fetchone()[0]==1
        assert db.execute('SELECT version_num FROM alembic_version').fetchone()[0]=='20261004_0020'
        assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
    assert hashlib.sha256(file.read_bytes()).hexdigest()==digest
print('PASS: empty comments on upgrade, populated draft/public rollback, preserved articles/media, re-upgrade and coordinated DB/media restore, integrity/FK.')
