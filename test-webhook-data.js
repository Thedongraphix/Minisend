// Quick test to verify webhook data in database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder() {
  const transactionCode = '2ccaaa97-377b-4637-be74-bf7e8f43a673';

  console.log('Querying order with transaction_code:', transactionCode);

  const { data, error } = await supabase
    .from('orders')
    .select('id, pretium_transaction_code, pretium_receipt_number, account_name, status, phone_number, amount_in_local, local_currency')
    .eq('pretium_transaction_code', transactionCode)
    .single();

  if (error) {
    console.error('Database error:', error);
    return;
  }

  if (!data) {
    console.error('Order not found!');
    return;
  }

  console.log('\n✅ Order found in database:');
  console.log(JSON.stringify(data, null, 2));

  // Check if receipt data is present
  if (data.pretium_receipt_number) {
    console.log('\n✅ Receipt number IS present:', data.pretium_receipt_number);
  } else {
    console.log('\n❌ Receipt number is MISSING');
  }

  if (data.account_name) {
    console.log('✅ Account name IS present:', data.account_name);
  } else {
    console.log('❌ Account name is MISSING');
  }

  if (data.status === 'completed') {
    console.log('✅ Status is completed');
  } else {
    console.log('❌ Status is NOT completed:', data.status);
  }
}

checkOrder().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
