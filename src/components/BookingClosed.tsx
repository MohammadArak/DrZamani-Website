
export default function BookingClosed({ message }: { message: string }) {
    return <main className="booking-closed" dir="rtl" lang="fa">
        <div className="booking-closed__card" role="status">
            <div className="booking-closed__symbol" aria-hidden="true">
                <span className="booking-closed__halo" />
                <svg viewBox="0 0 80 80" fill="none">
                    <rect x="14" y="18" width="52" height="48" rx="12" stroke="currentColor" strokeWidth="3" />
                    <path d="M14 32h52M28 12v12M52 12v12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <rect x="30" y="41" width="6" height="15" rx="2" fill="currentColor" />
                    <rect x="44" y="41" width="6" height="15" rx="2" fill="currentColor" />
                </svg>
            </div>
            <p>{message}</p>
            <p className="booking-closed__links"><a href="/">بازگشت به صفحه اصلی</a></p>
        </div>
    </main>;
}
