import './globals.css'
import Nav from '@/components/Nav'

export const metadata = {
  title: 'פורטל הדיירים | מתחם יצחק רבין–אפק',
  description: 'מידע, מסמכים ועדכונים במקום אחד',
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <header>
          <div className="wrap">
            <div>
              <h1>פורטל הדיירים | מתחם יצחק רבין–אפק</h1>
              <p>מידע, מסמכים ועדכונים במקום אחד</p>
            </div>
            <div className="logo" aria-label="לוגו">
              <svg width="34" height="40" viewBox="0 0 34 40" fill="none" stroke="#c4a466" strokeWidth="2" strokeLinecap="round"><circle cx="17" cy="5" r="3"/><path d="M17 8v28M10 14h14M4 26c2 7 7 10 13 10s11-3 13-10M4 26l3 2M30 26l-3 2"/></svg>
            </div>
          </div>
        </header>
        <main className="wrap">
          <Nav />
          {children}
          <footer>פורטל הדיירים של מתחם יצחק רבין–אפק. המידע האישי מוצג רק לבעל הדירה, לנציגות ולעורכי הדין של הפרויקט.</footer>
        </main>
      </body>
    </html>
  )
}
