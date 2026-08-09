
async function test() {
  const baseUrl = 'http://localhost:3001/api';

  console.log('--- Testing OTP Send ---');
  const sendRes = await fetch(`${baseUrl}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: '9876543212' })
  });
  const sendData = await sendRes.json();
  console.log('Send OTP Response:', sendData);

  if (!sendData.developmentOtp) {
    console.error('Failed: No development OTP received.');
    return;
  }

  console.log('\n--- Testing OTP Verify ---');
  const verifyRes = await fetch(`${baseUrl}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: '9876543212', otp: sendData.developmentOtp })
  });
  const verifyData = await verifyRes.json();
  console.log('Verify OTP Response:', verifyData);

  if (!verifyData.registrationRequired) {
    console.log('User already registered or error.');
    return;
  }

  console.log('\n--- Testing Registration ---');
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${verifyData.verificationToken}`
    },
    body: JSON.stringify({ name: 'Test User', mobile: '9876543212' })
  });
  const regData = await regRes.json();
  console.log('Registration Response:', regData);

  console.log('\n--- Testing Update Profile ---');
  const profileRes = await fetch(`${baseUrl}/users/profile`, {
    method: 'PUT',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${regData.token}`
    },
    body: JSON.stringify({ name: 'Test User Updated', about: 'Hello, this is my about section!' })
  });
  const profileData = await profileRes.json();
  console.log('Update Profile Response:', profileData);
}



test().catch(console.error);
