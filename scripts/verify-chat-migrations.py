"""Preserve populated chat/profile data across indexed sync upgrade/rollback."""
import os,sqlite3,subprocess,sys,json
from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import closing
api=Path(__file__).resolve().parents[1]/'api'
with TemporaryDirectory(prefix='drzamani-chat-') as directory:
    database=Path(directory)/'chat.db'
    env=dict(os.environ,APP_ENV='test',APP_DEBUG='false',SMS_PROVIDER='disabled',BOOKING_ENABLED='false',DATABASE_URL=f'sqlite:///{database.as_posix()}')
    def migrate(action,target):subprocess.run([sys.executable,'-m','alembic',action,target],cwd=api,env=env,check=True)
    migrate('upgrade','20261012_0024')
    with closing(sqlite3.connect(database)) as db:
        def fixture(table,values):
            for _,name,kind,required,default,primary in db.execute(f'PRAGMA table_info({table})'):
                if not required or default is not None or name in values or primary:continue
                values[name]=0 if 'INT' in kind or 'BOOL' in kind else '2026-01-01 12:00:00' if 'DATETIME' in kind else '16:00:00' if kind=='TIME' else '2026-01-01' if kind=='DATE' else ''
            columns=','.join(values);slots=','.join('?' for _ in values)
            return db.execute(f'INSERT INTO {table} ({columns}) VALUES ({slots})',tuple(values.values())).lastrowid
        patient=fixture('patients',dict(phone='00000000001',first_name='Synthetic',last_name='Migration',is_active=1))
        service=fixture('services',dict(title='Synthetic consultation',allows_media_chat=1,duration_minutes=30))
        appointment=fixture('appointments',dict(tracking_code='synthetic-chat',patient_id=patient,service_id=service,status='confirmed'))
        fixture('consultation_messages',dict(appointment_id=appointment,sender_type='patient',body='preserved synthetic message',created_at='2026-01-01 12:00:00',read_at='2026-01-01 13:00:00'))
        fixture('clinic_settings',dict(id=1))
        db.execute("UPDATE clinic_settings SET postal_code=?,business_hours_json=? WHERE id=1",("1234567890",json.dumps([dict(day_of_week="Saturday",opens="16:00",closes="20:00")])))
        db.commit()
    migrate('upgrade','20261012_0025')
    with closing(sqlite3.connect(database)) as db:
        assert db.execute('SELECT body,client_nonce,read_at FROM consultation_messages').fetchone()==('preserved synthetic message',None,'2026-01-01 13:00:00')
        indexes={row[1] for row in db.execute('PRAGMA index_list(consultation_messages)')}
        assert {'ix_consultation_thread_order','ix_consultation_thread_unread'}<=indexes
        db.execute("INSERT INTO consultation_messages (appointment_id,sender_type,body,client_nonce,created_at) VALUES (?,'patient','retry fixture','44444444-4444-4444-8444-444444444444','2026-01-02 12:00:00')",(appointment,));db.commit()
        try:
            db.execute("INSERT INTO consultation_messages (appointment_id,sender_type,body,client_nonce,created_at) VALUES (?,'patient','duplicate','44444444-4444-4444-8444-444444444444','2026-01-02 12:00:00')",(appointment,))
        except sqlite3.IntegrityError:db.rollback()
        else:raise AssertionError('Duplicate retry identifier accepted')
    migrate('downgrade','20261012_0024')
    with closing(sqlite3.connect(database)) as db:
        assert 'client_nonce' not in {row[1] for row in db.execute('PRAGMA table_info(consultation_messages)')}
        assert db.execute('SELECT COUNT(*) FROM consultation_messages').fetchone()==(2,)
        assert db.execute('SELECT postal_code FROM clinic_settings WHERE id=1').fetchone()==('1234567890',)
    migrate('upgrade','head')
    with closing(sqlite3.connect(database)) as db:
        assert db.execute('SELECT body FROM consultation_messages ORDER BY id').fetchall()==[('preserved synthetic message',),('retry fixture',)]
        assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
print('PASS: populated chat/profile upgrade, indexed order/unread, nonce uniqueness, rollback/re-upgrade and integrity/FK.')
