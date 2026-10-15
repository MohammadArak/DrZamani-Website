import RavielCredit from "./RavielCredit";
import { Component, type ReactNode } from "react";

/** A failed lazy chunk or render must leave a recoverable page for the visitor. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <main dir="rtl" className="min-h-screen bg-[#182435] px-6 py-24 text-center text-white">
                <div role="alert" className="mx-auto max-w-lg space-y-5">
                    <h1 className="text-2xl font-bold text-white">صفحه کامل بارگذاری نشد</h1>
                    <p className="leading-8">اتصال اینترنت را بررسی کنید و صفحه را دوباره بارگذاری کنید. اطلاعاتی که ذخیره نکرده‌اید ممکن است نیاز به ورود دوباره داشته باشد.</p>
                    <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-secondary px-6 py-3 text-jetblack focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">بارگذاری دوباره</button>
                    <a href="/" className="block underline underline-offset-4">بازگشت به صفحه اصلی</a>
                    {!/^\/staff(?:\/|$)/.test(window.location.pathname)&&<RavielCredit />}
                </div>
            </main>
        );
    }
}
