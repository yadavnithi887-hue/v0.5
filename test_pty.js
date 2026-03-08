const fs = require('fs');
try {
    const pty = require('node-pty');
    fs.writeFileSync('pty_test_result.txt', 'PTY working');
} catch (e) {
    fs.writeFileSync('pty_test_result.txt', 'PTY FAIL: ' + e.message);
}
