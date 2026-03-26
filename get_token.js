import https from 'https';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function getToken() {
  console.log('\n🔐 Getting Outlook Access Token\n');
  
  const email = await prompt('Email (jaden@praeto.co.za): ');
  const password = await prompt('Password: ');
  
  rl.close();
  
  const postData = new URLSearchParams({
    client_id: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
    scope: 'https://graph.microsoft.com/.default',
    username: email,
    password: password,
    grant_type: 'password'
  }).toString();

  const options = {
    hostname: 'login.microsoftonline.com',
    path: '/common/oauth2/v2.0/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (result.access_token) {
          console.log('\n✅ TOKEN OBTAINED!\n');
          console.log('Your access token:\n');
          console.log(result.access_token);
          console.log('\n');
          
          // Save to file
          import('fs').then(fs => {
            fs.writeFileSync('token.txt', result.access_token);
            console.log('💾 Saved to: token.txt\n');
          });
        } else {
          console.error('❌ Error:', result.error_description || result.error);
        }
      } catch (e) {
        console.error('❌ Failed:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Error:', e.message);
  });

  req.write(postData);
  req.end();
}

getToken();