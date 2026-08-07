import React, { useEffect, useRef } from 'react';

/**
 * Captcha Placeholder Component
 * 
 * Instructions for integrating Cloudflare Turnstile (Recommended for free tier):
 * 1. Sign up at https://dash.cloudflare.com/?to=/:account/turnstile
 * 2. Add your site and get a Site Key.
 * 3. Add the Turnstile script to your frontend/index.html <head>:
 *    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
 * 4. Replace the content of this component with the actual Turnstile implementation.
 * 
 * Example Implementation (Cloudflare Turnstile):
 * 
 * const Captcha = ({ onVerify }) => {
 *   useEffect(() => {
 *     if (window.turnstile) {
 *       window.turnstile.render('#captcha-container', {
 *         sitekey: 'YOUR_SITE_KEY_HERE',
 *         callback: function(token) {
 *           onVerify(token);
 *         },
 *       });
 *     }
 *   }, [onVerify]);
 * 
 *   return <div id="captcha-container"></div>;
 * };
 */

const Captcha = ({ onVerify }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Development mode bypass instruction
    console.log(
      '%c[Security] Captcha Component Placeholder rendered.',
      'color: orange; font-weight: bold;'
    );
    console.log(
      'To fully implement, follow instructions in frontend/src/components/Captcha.jsx'
    );
    
    // In a real scenario without a bypass, if we don't call onVerify, the form won't submit.
    // However, the backend currently has a development bypass.
    // So we'll pass an empty string to allow testing.
    onVerify(''); 
  }, [onVerify]);

  return (
    <div 
      ref={containerRef}
      className="w-full my-4 p-4 border border-dashed border-gray-500 rounded-md bg-gray-800 text-gray-300 text-sm text-center"
    >
      <p className="font-semibold text-yellow-500 mb-2">Security Challenge (Placeholder)</p>
      <p>This is where your Cloudflare Turnstile or reCAPTCHA widget will appear.</p>
      <p className="text-xs mt-2 text-gray-500">
        See <code>Captcha.jsx</code> for integration instructions.
      </p>
    </div>
  );
};

export default Captcha;
