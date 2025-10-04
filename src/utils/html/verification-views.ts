export const verificationSuccessPage = ({
  email,
  redirectUrl,
}: {
  email: string;
  redirectUrl: string;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verified Successfully</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .container { background: #fff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,.1); padding: 60px 40px; text-align: center; max-width: 560px; width: 100%; animation: slideUp .6s ease-out; }
    @keyframes slideUp { from {opacity:0; transform: translateY(30px);} to {opacity:1; transform: translateY(0);} }
    .success-icon { width: 80px; height: 80px; background: linear-gradient(135deg,#4CAF50,#45a049); border-radius: 50%; display:flex; align-items:center; justify-content:center; margin:0 auto 30px; animation: bounce .6s ease-out .2s both; }
    @keyframes bounce { 0%,20%,53%,80%,100%{transform:translate3d(0,0,0);} 40%,43%{transform:translate3d(0,-15px,0);} 70%{transform:translate3d(0,-7px,0);} 90%{transform:translate3d(0,-2px,0);} }
    .checkmark { color:#fff; font-size:40px; font-weight:700; }
    h1 { color:#333; font-size:32px; margin-bottom:20px; font-weight:600; }
    .welcome-text { color:#666; font-size:18px; line-height:1.6; margin-bottom:30px; }
    .email-display { background:#f8f9fa; border:2px solid #e9ecef; border-radius:10px; padding:15px; margin:20px 0; font-weight:600; color:#495057; word-break:break-all; }
    .success-details { background: linear-gradient(135deg,#e8f5e8,#f0f8f0); border-left:4px solid #4CAF50; border-radius:8px; padding:20px; margin:30px 0; text-align:left; }
    .success-details h3 { color:#2e7d32; margin-bottom:10px; font-size:18px; }
    .success-details ul { color:#388e3c; padding-left:20px; }
    .success-details li { margin-bottom:8px; line-height:1.5; }
    .cta-button { background: linear-gradient(135deg,#667eea,#764ba2); color:#fff; padding:15px 30px; border:none; border-radius:50px; font-size:16px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-block; margin-top:20px; transition: all .3s ease; box-shadow: 0 4px 15px rgba(102,126,234,.3); }
    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,.4); }
    .footer-text { color:#999; font-size:14px; margin-top:30px; line-height:1.5; }
    .company-name { color:#667eea; font-weight:600; }
    @media (max-width:480px){ .container{ padding:40px 20px;} h1{font-size:28px;} .welcome-text{font-size:16px;} }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon"><div class="checkmark">✓</div></div>
    <h1>Welcome to Sara7a!</h1>
    <p class="welcome-text">Congratulations! Your email has been successfully verified and your account is now fully activated.</p>
    <div class="email-display">${email}</div>
    <div class="success-details">
      <h3>🎉 Your Account is Ready!</h3>
      <ul>
        <li>✅ Email address verified</li>
        <li>✅ Account fully activated</li>
        <li>✅ All features unlocked</li>
        <li>✅ Ready to start using Sara7a</li>
      </ul>
    </div>
    <a href="${redirectUrl}" class="cta-button">Start Using Sara7a</a>
    <p class="footer-text">Thank you for joining <span class="company-name">Sara7a Application</span>!<br/>You can now close this window and start exploring all our features.</p>
  </div>
  <script>
    setTimeout(() => { try { window.location.href = '${redirectUrl}'; } catch(e) {} }, 10000);
  </script>
</body>
</html>`;

export const verificationErrorPage = ({
  retryUrl,
  supportUrl,
}: {
  retryUrl: string;
  supportUrl: string;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
    .container { background:#fff; border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,.1); padding:60px 40px; text-align:center; max-width:560px; width:100%; animation: slideUp .6s ease-out; }
    @keyframes slideUp { from {opacity:0; transform: translateY(30px);} to {opacity:1; transform: translateY(0);} }
    .error-icon { width:80px; height:80px; background: linear-gradient(135deg,#ff6b6b,#ee5a24); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 30px; animation: shake .6s ease-out .2s both; }
    @keyframes shake { 0%,100%{transform:translateX(0);} 10%,30%,50%,70%,90%{transform:translateX(-5px);} 20%,40%,60%,80%{transform:translateX(5px);} }
    .error-mark { color:#fff; font-size:40px; font-weight:700; }
    h1 { color:#333; font-size:32px; margin-bottom:20px; font-weight:600; }
    .error-text { color:#666; font-size:18px; line-height:1.6; margin-bottom:30px; }
    .error-details { background: linear-gradient(135deg,#ffe8e8,#fff0f0); border-left:4px solid #ff6b6b; border-radius:8px; padding:20px; margin:30px 0; text-align:left; }
    .error-details h3 { color:#d63031; margin-bottom:15px; font-size:18px; }
    .error-details p { color:#e17055; line-height:1.6; margin-bottom:10px; }
    .cta-buttons { display:flex; gap:15px; justify-content:center; flex-wrap:wrap; margin-top:30px; }
    .cta-button { padding:12px 25px; border:none; border-radius:50px; font-size:14px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-block; transition:all .3s ease; }
    .primary-button { background: linear-gradient(135deg,#667eea,#764ba2); color:#fff; box-shadow: 0 4px 15px rgba(102,126,234,.3); }
    .primary-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,.4); }
    .secondary-button { background:#f8f9fa; color:#495057; border:2px solid #e9ecef; }
    .secondary-button:hover { background:#e9ecef; transform: translateY(-1px); }
    .footer-text { color:#999; font-size:14px; margin-top:30px; line-height:1.5; }
    @media (max-width:480px){ .container{ padding:40px 20px;} h1{font-size:28px;} .error-text{font-size:16px;} .cta-buttons{flex-direction:column; align-items:center;} .cta-button{ width:200px;} }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon"><div class="error-mark">✕</div></div>
    <h1>Verification Failed</h1>
    <p class="error-text">We're sorry, but we couldn't verify your email address. The verification link may have expired or is invalid.</p>
    <div class="error-details">
      <h3>⚠️ What happened?</h3>
      <p>• The verification token may have expired (tokens are valid for 24 hours)</p>
      <p>• The link may have been used already</p>
      <p>• The email address might not match our records</p>
      <p>• The verification link may be corrupted</p>
    </div>
    <div class="cta-buttons">
      <a href="${retryUrl}" class="cta-button primary-button">Try Again</a>
      <a href="${supportUrl}" class="cta-button secondary-button">Contact Support</a>
    </div>
    <p class="footer-text">Need help? Contact our support team and we'll assist you with the verification process.</p>
  </div>
</body>
</html>`;
