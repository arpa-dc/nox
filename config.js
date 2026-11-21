// Modifie ici tes offres, FAQ et messages
module.exports = {
  // Ces comptes ont TOUTES les permissions sur le bot (contournent tous les contrôles)
  // Rôle client autorisé à poster un avis + salon où les avis sont publiés
  clientRoleId: '1573066640428630087',
  reviewsChannelId: '1573071048038031440',
  // Salon où le message de bienvenue est envoyé
  welcomeChannelId: '1573650969542000720',
  // Salon où les montées de niveau sont annoncées
  levelChannelId: '1573072368589607092',
  // Récompenses de niveau : { niveau: 'ID du rôle' }
  levelRewards: { 25: '1573066612645437570' },
  ownerIds: ['1231989333029027932', '1516504186014142495'],
  brandName: 'NOX | Coaching',
  color: 0xffffff,
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
    `Bienvenue ${member} sur **NOX | Coaching** ! Lis le <#1573062004212637706>, profite bien !`,
};
