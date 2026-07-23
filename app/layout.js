import { Playfair_Display, Lato, Great_Vibes } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["100", "300", "400", "700"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata = {
  title: "Yusuf & Şevval Nişan Töreni",
  description: "Yusuf ve Şevval'in nişan töreni için fotoğraf paylaşım sayfası.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${playfair.variable} ${lato.variable} ${greatVibes.variable}`}>
      <body>{children}</body>
    </html>
  );
}
