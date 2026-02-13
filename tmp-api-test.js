// Test the cacheOnly endpoint to see if overrides are applied
async function main() {
  const res = await fetch('https://factory.brownstreet.co.kr/api/smartstore/products?cacheOnly=true', {
    headers: {
      'Cookie': 'auth-token=test' // Will need real auth
    }
  });

  // It might redirect to login, let's check
  console.log('Status:', res.status);
  console.log('URL:', res.url);

  if (res.status === 200) {
    const data = await res.json();
    const products = data.data?.contents || [];
    console.log('Total products:', products.length);

    // Check products that should be in ARCHIVE
    const archiveIds = ['12907447005', '12896905632', '12896994857'];
    archiveIds.forEach(id => {
      const p = products.find(p => p.originProductNo === id);
      if (p) {
        console.log(`${id}: internalCategory=${p.internalCategory}, archiveTier=${p.archiveTier}, lifecycle=${p.lifecycle?.stage}`);
      } else {
        console.log(`${id}: NOT FOUND in response`);
      }
    });

    // Count by category
    const cats = {};
    products.forEach(p => {
      const cat = p.internalCategory || 'UNKNOWN';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    console.log('\nCategory distribution:', JSON.stringify(cats, null, 2));
  } else {
    const text = await res.text();
    console.log('Response:', text.substring(0, 300));
  }
}
main().catch(e => console.error(e.message));
