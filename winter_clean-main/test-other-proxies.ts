import fetch from 'node-fetch';

const TOKEN = 'sk_1788.HCItQaSi85wlaVxswQnuEhnf7hJIRVB3';
const targetUrl = 'https://api.decolecta.com/v1/reniec/dni?numero=40000002';

async function testProxy(name: string, proxyUrlGenerator: (url: string) => string) {
  const proxyUrl = proxyUrlGenerator(targetUrl);
  console.log(`\nTesting proxy: ${name}`);
  try {
    const res = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log('Sample Data:', text.substring(0, 200));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

async function run() {
  // Test thingproxy
  await testProxy('thingproxy.freeboard.io', (url) => `https://thingproxy.freeboard.io/fetch/${url}`);
  
  // Test codetabs
  await testProxy('api.codetabs.com', (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
  
  // Test allorigins
  await testProxy('api.allorigins.win', (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
}

run();
