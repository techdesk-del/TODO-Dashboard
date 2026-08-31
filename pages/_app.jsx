import '../styles/globals.css';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>UrbanGaon — Team Task & EOD Real-Time Dashboard</title>
        <meta name="description" content="UrbanGaon Collaborative Real-Time Task Management and End-of-Day Checkout Dashboard." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/favicon.svg" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}