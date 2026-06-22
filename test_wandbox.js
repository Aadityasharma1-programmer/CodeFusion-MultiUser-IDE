const data = JSON.stringify({
  compiler: 'gcc-head',
  code: '#include<iostream>\nusing namespace std;\nint main(){ cout<<"hello"; }'
});
fetch('https://wandbox.org/api/compile.json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: data
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
