export const environment = {
  production: false,
  //apiUrl: 'https://64q9nbwz-3000.euw.devtunnels.ms',
   apiUrl: window.location.hostname === 'localhost' ? 'http://192.168.56.1:3000' : 'https://714e-154-111-224-232.ngrok-free.app',
};
