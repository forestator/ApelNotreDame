// Config web Firebase : ces valeurs sont publiques par conception (la sécurité repose sur firestore.rules).
// EmailJS (https://www.emailjs.com) : tant que ces trois valeurs sont vides, aucun e-mail n'est envoyé.
// La clé publique est faite pour être exposée ; limitez les domaines autorisés dans le tableau de bord EmailJS.
export const environment = {
  emailjs: {
    serviceId: '',
    templateId: '',
    publicKey: '',
  },
  firebase: {
    apiKey: 'AIzaSyBxWYd8J5KzaR4KeaDVZlFyRKP_amV_L1g',
    authDomain: 'apelnotredame-b609c.firebaseapp.com',
    projectId: 'apelnotredame-b609c',
    storageBucket: 'apelnotredame-b609c.firebasestorage.app',
    messagingSenderId: '491832188033',
    appId: '1:491832188033:web:2ad1b933bc209497210180',
  },
};
