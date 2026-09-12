import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="font-sans antialiased text-slate-800 bg-[#f8fafc]">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
