// Modifie ici tes offres, FAQ et messages
module.exports = {
  // Ces comptes ont TOUTES les permissions sur le bot (contournent tous les contrôles)
  ownerIds: ['1231989333029027932', '1516504186014142495'],
  brandName: 'Mon Coaching',
  color: 0x5865f2,
  offers: [
    { id: 'decouverte', name: 'Séance découverte', price: '0 €', duration: '30 min', desc: 'Premier échange pour définir tes objectifs.' },
    { id: 'solo', name: 'Séance individuelle', price: '60 €', duration: '1 h', desc: 'Coaching 1-to-1 personnalisé.' },
    { id: 'pack4', name: 'Pack 4 séances', price: '200 €', duration: '4 x 1 h', desc: 'Suivi régulier à tarif réduit.' },
    { id: 'premium', name: 'Accompagnement Premium', price: '450 €/mois', duration: 'Suivi illimité', desc: 'Séances + support Discord prioritaire.' },
  ],
  faq: [
    { q: 'Comment réserver une séance ?', a: 'Utilise la commande `/reserver` puis choisis ton offre et ta date.' },
    { q: 'Comment payer ?', a: 'Le paiement est détaillé dans ton ticket après la réservation.' },
    { q: 'Puis-je annuler ou déplacer ?', a: 'Oui, jusqu\'à 24 h avant avec `/rdv annuler`.' },
  ],
  welcomeMessage: (member) =>
    `Bienvenue ${member} ! 👋 Tape \`/services\` pour découvrir mes offres et \`/reserver\` pour prendre rendez-vous.`,
};
