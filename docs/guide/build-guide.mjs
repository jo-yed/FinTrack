// Générateur du guide d'utilisation (voir README.md de ce dossier). Les chemins ci-dessous sont ceux de la machine de fabrication : à adapter.
// Fabrique le guide d'utilisation illustré (HTML -> PDF A4).
// Dépendances : playwright, qrcode (installées à part) ; icônes : lucide-react du projet.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

const require = createRequire('C:/Users/jolub/Downloads/FinTrack/package.json');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const L = require('lucide-react');

const OUT_DIR = process.argv[2];
const SHOTS = path.join(OUT_DIR, 'shots');
const URL_APP = 'https://fin-track-theta-ten.vercel.app';
const FONT_DIR = 'C:/Users/jolub/Downloads/FinTrack/node_modules/@fontsource-variable/inter/files';

const ALIAS = { SquarePlus: 'PlusSquare', EllipsisVertical: 'MoreVertical', House: 'Home', CircleHelp: 'HelpCircle', ChartColumn: 'BarChart3', CircleAlert: 'AlertCircle' };
function ic(name, size = 20, color = 'currentColor', sw = 2) {
  const C = L[name] || L[ALIAS[name]];
  if (!C) throw new Error('icône inconnue : ' + name);
  return renderToStaticMarkup(React.createElement(C, { size, color, strokeWidth: sw }));
}

const qr = await QRCode.toString(URL_APP, { type: 'svg', margin: 0, color: { dark: '#0F172A', light: '#0000' } });

const LOGO = `<svg viewBox="0 0 120 120" fill="none"><defs><linearGradient id="lbg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/></linearGradient><linearGradient id="lac" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#3B82F6"/><stop offset="100%" stop-color="#10B981"/></linearGradient></defs><rect x="6" y="6" width="108" height="108" rx="28" fill="url(#lbg)"/><path d="M60 26 L88 42 L88 78 L60 94 L32 78 L32 42 Z" fill="none" stroke="url(#lac)" stroke-width="3"/><path d="M46 78 L46 42 L74 42" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M46 60 L66 60" stroke="white" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M58 68 L66 58 L72 64 L82 50" stroke="url(#lac)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M76 50 L82 50 L82 56" stroke="url(#lac)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

// ---------- composants ----------
const badge = (n, x, y, cls = '') => `<span class="badge ${cls}" style="left:${x}%;top:${y}%">${n}</span>`;
const phone = (img, { w = 52, callouts = [], cls = '', rot = 0, win = null } = {}) => {
  const [y0, y1] = win || [0, 1];
  const span = y1 - y0;
  const aspect = `${390} / ${(844 * span).toFixed(1)}`;
  const imgStyle = win ? `position:absolute;left:0;width:100%;top:${(-(y0 / span) * 100).toFixed(2)}%` : '';
  const pins = callouts.map(c => badge(c[0], c[1], win ? ((c[2] - y0 * 100) / span).toFixed(1) : c[2])).join('');
  return `
  <div class="phone ${cls}" style="width:${w}mm;${rot ? `transform:rotate(${rot}deg)` : ''}">
    <div class="wrap"><div class="screen" style="aspect-ratio:${aspect}"><img src="shots/${img}.jpg" alt="" style="${imgStyle}"></div>${pins}</div>
  </div>`;
};
const legend = items => `<ol class="legend">${items.map((t, i) => `<li><span class="badge sm">${i + 1}</span><span>${t}</span></li>`).join('')}</ol>`;
const tip = (title, text, kind = 'tip') => `<div class="note ${kind}"><div class="note-ic">${ic(kind === 'warn' ? 'AlertCircle' : 'Lightbulb', 18)}</div><div><b>${title}</b><br>${text}</div></div>`;

let pageNo = 0;
const TOTAL = 13;
const page = (num, title, subtitle, icon, color, body) => {
  pageNo += 1;
  return `
  <section class="page">
    <header class="top">
      <div class="top-num" style="background:${color}">${num}</div>
      <div class="top-txt"><h1>${title}</h1><p>${subtitle}</p></div>
      <div class="top-ic" style="color:${color}">${ic(icon, 44, color, 1.6)}</div>
    </header>
    <div class="body">${body}</div>
    <footer class="foot"><span>FinTrack · Guide d'utilisation</span><span class="pw">Powered by <b>JoYed'S</b></span><span>${pageNo + 1} / ${TOTAL}</span></footer>
  </section>`;
};

// ---------- maquettes d'installation ----------
const step = (n, caption, mock) => `<div class="mini"><div class="mini-mock">${mock}</div><div class="mini-cap"><span class="badge sm">${n}</span><span>${caption}</span></div></div>`;
const homeIcon = (hl = false) => `<div class="app ${hl ? 'hl' : ''}"><div class="app-ic">${hl ? LOGO : ''}</div><span>${hl ? 'FinTrack' : ''}</span></div>`;
const androidMocks = [
  step(1, 'Ouvrez FinTrack dans <b>Chrome</b>, puis touchez <b>⋮</b> en haut à droite.', `
    <div class="bar"><span class="lock">${ic('Lock', 9)}</span><span class="url">fin-track-theta-ten.vercel.app</span><span class="dots ring">${ic('EllipsisVertical', 14)}</span></div>
    <div class="page-skel"><i></i><i></i><i style="width:60%"></i></div>`),
  step(2, 'Touchez <b>« Installer l\'application »</b> (ou « Ajouter à l\'écran d\'accueil »).', `
    <ul class="menu"><li>Nouvel onglet</li><li>Historique</li><li class="hl">${ic('Download', 12)} Installer l'application</li><li>Partager…</li><li>Paramètres</li></ul>`),
  step(3, 'Confirmez avec <b>« Installer »</b>.', `
    <div class="dialog"><div class="d-title"><span class="d-ic">${LOGO}</span><div><b>Installer l'application ?</b><br><small>FinTrack</small></div></div><div class="d-btns"><span>Annuler</span><span class="hl">Installer</span></div></div>`),
  step(4, 'L\'icône <b>FinTrack</b> est sur votre écran d\'accueil. Touchez-la !', `<div class="grid-apps">${homeIcon()}${homeIcon()}${homeIcon(true)}${homeIcon()}${homeIcon()}${homeIcon()}</div>`),
];
const iosMocks = [
  step(1, 'Ouvrez FinTrack dans <b>Safari</b> (pas Chrome), puis touchez <b>Partager</b>.', `
    <div class="page-skel tall"><i></i><i></i><i style="width:60%"></i></div>
    <div class="ios-bar"><span>${ic('ChevronLeft', 14)}</span><span>${ic('ChevronRight', 14)}</span><span class="ring">${ic('Share', 15)}</span><span>${ic('BookOpen', 14)}</span><span>${ic('Copy', 14)}</span></div>`),
  step(2, 'Faites défiler et touchez <b>« Sur l\'écran d\'accueil »</b>.', `
    <ul class="menu ios"><li>Copier</li><li>Ajouter aux favoris</li><li class="hl">${ic('SquarePlus', 13)} Sur l'écran d'accueil</li><li>Imprimer</li></ul>`),
  step(3, 'Gardez le nom <b>FinTrack</b> et touchez <b>« Ajouter »</b> en haut à droite.', `
    <div class="ios-add"><div class="ia-top"><span>Annuler</span><b>Sur l'écran d'accueil</b><span class="hl">Ajouter</span></div><div class="ia-row"><span class="d-ic">${LOGO}</span><div class="ia-name">FinTrack</div></div></div>`),
  step(4, 'L\'icône est sur votre écran d\'accueil, comme n\'importe quelle application.', `<div class="grid-apps">${homeIcon()}${homeIcon()}${homeIcon()}${homeIcon()}${homeIcon(true)}${homeIcon()}</div>`),
];
const pcMocks = [
  step(1, 'Dans <b>Chrome</b> ou <b>Edge</b>, cliquez sur l\'icône <b>Installer</b> à droite de l\'adresse.', `
    <div class="bar pc"><span class="lock">${ic('Lock', 9)}</span><span class="url">fin-track-theta-ten.vercel.app</span><span class="ring">${ic('Monitor', 13)}</span><span class="dots">${ic('EllipsisVertical', 14)}</span></div>
    <div class="page-skel"><i></i><i style="width:70%"></i></div>`),
  step(2, 'Cliquez sur <b>« Installer »</b> : FinTrack s\'ouvre dans sa propre fenêtre.', `
    <div class="dialog pc"><div class="d-title"><span class="d-ic">${LOGO}</span><div><b>Installer FinTrack ?</b><br><small>Ouverture rapide, fenêtre dédiée</small></div></div><div class="d-btns"><span>Annuler</span><span class="hl">Installer</span></div></div>`),
];

// ---------- pages ----------
const pages = [];

// 1 · Couverture
pages.push(`
<section class="page cover">
  <div class="glow g1"></div><div class="glow g2"></div>
  <div class="cover-left">
    <div class="cover-logo">${LOGO}</div>
    <div class="kicker">FinTrack</div>
    <h1>Guide<br>d'utilisation</h1>
    <p class="lead">Suivez l'argent de votre famille et de votre travail, simplement, depuis votre téléphone.</p>
    <ul class="cover-points">
      <li>${ic('Smartphone', 18)}<span>S'installe sur n'importe quel téléphone, sans boutique d'applications</span></li>
      <li>${ic('WifiOff', 18)}<span>Résiste aux connexions faibles et aux coupures de réseau</span></li>
      <li>${ic('ShieldCheck', 18)}<span>Vos données restent privées et protégées</span></li>
    </ul>
    <div class="cover-qr"><div class="qr">${qr}</div><div><b>Scannez pour ouvrir FinTrack</b><br><span>${URL_APP.replace('https://', '')}</span></div></div>
    <div class="cover-foot">Version 1.0 · Octobre 2026 &nbsp;·&nbsp; Powered by <b>JoYed'S</b></div>
  </div>
  <div class="cover-right">
    ${phone('s05-tableau-de-bord', { w: 78, cls: 'big', rot: 3 })}
  </div>
</section>`);

// 2 · L'essentiel
pages.push(page(1, 'L\'essentiel en une page', 'Si vous n\'avez que 3 minutes, lisez celle-ci.', 'Zap', '#F59E0B', `
  <p class="intro">FinTrack vous montre <b>où va votre argent</b> : pour vous, votre famille et votre travail. Voici ce que vous pouvez faire :</p>
  <div class="tiles">
    ${[
      ['CreditCard', '#3B82F6', 'Transactions', 'Notez chaque dépense et chaque revenu en quelques secondes.'],
      ['Landmark', '#10B981', 'Comptes', 'Banque, Orange Money, MTN MoMo, espèces : tous vos soldes au même endroit.'],
      ['Users', '#EC4899', 'Budget Famille', 'Une enveloppe par membre de la famille, avec son propre accès.'],
      ['Briefcase', '#8B5CF6', 'Budgets Perso & Pro', 'Un budget par projet (mission, rentrée…) avec vos propres catégories.'],
      ['Camera', '#F59E0B', 'Justificatifs', 'Photographiez le reçu : il reste attaché à la dépense.'],
      ['Lock', '#06B6D4', 'Coffre-fort', 'Mots de passe et notes protégés par un mot de passe maître.'],
    ].map(([i, c, t, d]) => `<div class="tile"><div class="tile-ic" style="background:${c}1a;color:${c}">${ic(i, 26, c)}</div><div><b>${t}</b><p>${d}</p></div></div>`).join('')}
  </div>
  <h2 class="h2">Démarrer en 3 étapes</h2>
  <div class="three">
    <div class="three-i"><div class="big">1</div><b>Installer</b><p>Ajoutez FinTrack à l'écran d'accueil de votre téléphone.</p><span class="pg">Page 3</span></div>
    <div class="three-i"><div class="big">2</div><b>Créer son compte</b><p>Avec une adresse e-mail, ou avec votre nom et votre numéro de téléphone.</p><span class="pg">Page 4</span></div>
    <div class="three-i"><div class="big">3</div><b>Noter une dépense</b><p>Touchez « Nouvelle Transaction », saisissez, enregistrez. C'est fait.</p><span class="pg">Page 7</span></div>
  </div>
  <h2 class="h2">Les mots à connaître</h2>
  <div class="lex">
    <div><b>Budget Famille</b><p>L'enveloppe mensuelle de chaque membre de la famille et ses dépenses.</p></div>
    <div><b>Budget Perso & Pro</b><p>Un projet à part (une mission, la rentrée…) avec ses catégories, ses fonds reçus et ses justificatifs.</p></div>
    <div><b>Justificatif</b><p>La preuve d'une dépense : photo du reçu, de la facture ou PDF.</p></div>
    <div><b>Code de demande</b><p>Le code que reçoit un membre qui rejoint la famille, à donner à l'administrateur.</p></div>
  </div>
  ${tip('Bon à savoir', 'FinTrack est une application « web » : pas besoin de Play Store ni d\'App Store, et elle se met à jour toute seule. Elle fonctionne sur Android, iPhone et ordinateur.')}
`));

// 3 · Installer
pages.push(page(2, 'Installer FinTrack sur votre téléphone', 'Une seule fois, en 30 secondes. Ensuite, FinTrack s\'ouvre comme une vraie application.', 'Smartphone', '#3B82F6', `
  <div class="os"><div class="os-h"><span class="os-tag" style="background:#10B981">${ic('Smartphone', 15, '#fff')} Android</span> <small>Chrome, Samsung Internet, Edge…</small></div><div class="minis">${androidMocks.join('')}</div></div>
  <div class="os"><div class="os-h"><span class="os-tag" style="background:#0F172A">${ic('Smartphone', 15, '#fff')} iPhone / iPad</span> <small>Obligatoire : utilisez <b>Safari</b></small></div><div class="minis">${iosMocks.join('')}</div></div>
  <div class="os"><div class="os-h"><span class="os-tag" style="background:#3B82F6">${ic('Monitor', 15, '#fff')} Ordinateur</span> <small>Windows, Mac, Linux</small></div><div class="minis two">${pcMocks.join('')}
    <div class="side-tip">${tip('Pas de bouton « Installer » ?', 'Ouvrez le menu du navigateur et cherchez « Installer FinTrack » ou « Ajouter à l\'écran d\'accueil ». Dans <b>Paramètres → Application mobile</b> de FinTrack, vous retrouvez ces explications.')}</div>
  </div></div>
  <h2 class="h2">Une fois installée</h2>
  <div class="perks">
    <div>${ic('Smartphone', 22, '#3B82F6')}<b>Plein écran</b><span>Sans barre d'adresse, comme une vraie application.</span></div>
    <div>${ic('Zap', 22, '#F59E0B')}<b>Ouverture rapide</b><span>Une icône, un toucher.</span></div>
    <div>${ic('WifiOff', 22, '#10B981')}<b>Réseau capricieux</b><span>Vos dépenses sont gardées si le réseau coupe.</span></div>
    <div>${ic('RefreshCw', 22, '#8B5CF6')}<b>Toujours à jour</b><span>Mises à jour automatiques.</span></div>
  </div>
`));

// 4 · Créer son compte
pages.push(page(3, 'Créer son compte', 'Deux façons de commencer, selon que vous gérez la famille ou que vous la rejoignez.', 'UserPlus', '#10B981', `
  <div class="cols2">
    <div class="col">
      <div class="who" style="background:#3B82F61a;color:#1d4ed8">${ic('User', 16)} Vous gérez les finances (administrateur)</div>
      <div class="phone-row">${phone('s03a-inscription-perso', { w: 58, callouts: [[1, 100, 27.5], [2, 100, 35.8], [3, 100, 46.8], [4, 100, 57.6], [5, 100, 78.7]] })}
      <ol class="steps">
        <li><span class="badge sm">1</span><span>Touchez <b>« Créer un Compte »</b>.</span></li>
        <li><span class="badge sm">2</span><span>Choisissez <b>« Compte personnel »</b>.</span></li>
        <li><span class="badge sm">3</span><span>Saisissez votre <b>adresse e-mail</b>.</span></li>
        <li><span class="badge sm">4</span><span>Choisissez un <b>mot de passe</b> (8 caractères minimum) et confirmez-le.</span></li>
        <li><span class="badge sm">5</span><span>Touchez <b>« S'inscrire »</b>, ouvrez l'e-mail reçu et touchez le <b>lien de confirmation</b>. Connectez-vous, puis complétez votre nom dans <b>« Mon profil »</b>.</span></li>
      </ol></div>
    </div>
    <div class="col">
      <div class="who" style="background:#EC48991a;color:#be185d">${ic('Users', 16)} Vous rejoignez votre famille (sans e-mail)</div>
      <div class="phone-row">${phone('s03-inscription-famille', { w: 58, callouts: [[1, 100, 31.6], [2, 100, 59], [3, 100, 70], [4, 100, 85.5]] })}
      <ol class="steps">
        <li><span class="badge sm">1</span><span>« Créer un Compte », puis <b>« Rejoindre ma famille »</b>.</span></li>
        <li><span class="badge sm">2</span><span>Écrivez votre <b>nom complet</b>.</span></li>
        <li><span class="badge sm">3</span><span>Votre <b>numéro de téléphone</b>, par exemple 6 77 11 22 33.</span></li>
        <li><span class="badge sm">4</span><span>Un <b>mot de passe</b> à retenir, puis <b>« S'inscrire »</b>.</span></li>
        <li><span class="badge sm plain">5</span><span>Vous recevez un <b>code</b> à envoyer à l'administrateur de votre famille (page 8).</span></li>
      </ol></div>
    </div>
  </div>
  ${tip('Astuce', 'Le téléphone remplace l\'e-mail : vous n\'avez pas besoin de boîte mail pour utiliser FinTrack en famille. Le numéro sert uniquement d\'identifiant.')}
`));

// 5 · Connexion et profil
pages.push(page(4, 'Se connecter et personnaliser son profil', 'Votre nom et votre avatar s\'affichent partout dans l\'application.', 'UserRound', '#EC4899', `
  <div class="cols2 gap">
    <div class="col">
      <h2 class="h2 first">Se connecter</h2>
      <div class="phone-row">${phone('s02-connexion-telephone', { w: 56, callouts: [[1, 100, 32], [2, 100, 40], [3, 100, 76]] })}
      ${legend(['Choisissez <b>« Se Connecter »</b>.', 'Touchez <b>« Par e-mail »</b> ou <b>« Par téléphone »</b>.', 'Saisissez votre identifiant et votre mot de passe, puis <b>« Se Connecter »</b>.'])}</div>
      <p class="small">Mot de passe oublié ? Touchez le lien <b>« Mot de passe oublié ? »</b> : un e-mail vous permet d'en choisir un nouveau. Pour un accès par téléphone, demandez à l'administrateur de votre famille de vous en donner un provisoire.</p>
    </div>
    <div class="col">
      <h2 class="h2 first">Votre profil</h2>
      <div class="phone-row">${phone('s07-profil', { w: 56, callouts: [[1, 70, 23], [2, 100, 41], [3, 100, 54.5], [4, 100, 69.5], [5, 100, 79]] })}
      ${legend(['Un <b>avatar</b> dessiné, ou votre <b>photo</b>.', 'Votre <b>sexe</b>.', 'Votre <b>tranche d\'âge</b> : enfant, adolescent, adulte, senior.', 'Votre <b>teint</b>.', 'Une <b>couleur</b> de fond.'])}</div>
      <p class="small">Pour l'ouvrir : touchez votre avatar en haut à droite, puis <b>« Modifier mon profil »</b>. Renseignez aussi votre nom complet, puis <b>Enregistrer</b>.</p>
    </div>
  </div>
  ${tip('Sécurité', 'Pour votre protection, FinTrack vous déconnecte automatiquement après 30 minutes sans activité. Touchez simplement « Se Connecter » pour reprendre.')}
`));

// 6 · Tableau de bord
pages.push(page(5, 'Le tableau de bord', 'Votre situation d\'un seul coup d\'œil, dès l\'ouverture.', 'LayoutDashboard', '#3B82F6', `
  <div class="phone-row start">${phone('s05-tableau-de-bord', { w: 56, callouts: [[1, 14, 8.5], [2, 88, 8.5], [3, 100, 23], [4, 100, 51]] })}
  <div class="grow">
    ${legend(['<b>Le menu</b> : toutes les pages (Transactions, Comptes, Rapports, Objectifs, Budgets, Coffre-fort, Paramètres).', '<b>Votre profil</b> : modifier votre avatar, ouvrir les paramètres ou vous déconnecter.', '<b>Budget Famille</b> : ce qui est alloué à la famille, dépensé et restant ce mois-ci.', '<b>Budgets Perso & Pro</b> : vos projets personnels et professionnels, séparés de la famille.'])}
    <p class="small">En faisant défiler, vous trouvez vos <b>revenus</b>, vos <b>dépenses</b>, votre <b>solde</b>, votre <b>taux d'épargne</b> et les graphiques du mois.</p>
    ${tip('Deux budgets bien séparés', 'Le budget de la famille et vos budgets personnels ou professionnels ne se mélangent jamais : chacun a sa carte et ses chiffres.')}
  </div></div>
  <h2 class="h2">Sur ordinateur, c'est la même chose en plus large</h2>
  <div class="desk"><img src="shots/s23-ordinateur.jpg" alt=""></div>
`));

// 7 · Ajouter une dépense
pages.push(page(6, 'Noter une dépense ou un revenu', 'Le geste le plus important : 10 secondes, à chaque fois.', 'CreditCard', '#EF4444', `
  <div class="phone-row start">
    ${phone('s08-nouvelle-transaction', { w: 60, callouts: [[1, 100, 22], [2, 100, 32.5], [3, 49, 41.5], [4, 100, 52], [5, 100, 70], [6, 100, 84]] })}
    <div class="grow">
      <p class="intro small-top">Menu → <b>Transactions</b> → <b>« Nouvelle Transaction »</b> :</p>
      ${legend(['<b>Dépense</b> (en rouge) ou <b>Revenu</b>.', '<b>Description</b> : « Courses au marché », « Salaire »…', '<b>Montant</b> en FCFA et <b>date</b>.', '<b>Catégorie</b> : Alimentation, Transport, Santé… (vous pouvez créer les vôtres dans Paramètres).', '<b>Compte</b> utilisé : banque, Orange Money, espèces… (facultatif).', '<b>Membre de la famille</b> concerné (facultatif).'])}
      <p class="small">Faites défiler puis touchez <b>« Enregistrer »</b>. Le solde du compte se met à jour tout seul.</p>
    </div>
  </div>
  <div class="phone-row start">
    ${phone('s09-transactions', { w: 60, win: [0.5, 1], callouts: [[1, 53, 80], [2, 82, 95]] })}
    <div class="grow">
      <h2 class="h2 first">Retrouver et corriger</h2>
      ${legend(['Le bouton <b>« Nouvelle Transaction »</b> est toujours en haut de la liste.', 'Le <b>crayon</b> modifie une ligne, la <b>corbeille</b> la supprime.'])}
      <p class="small">Utilisez la <b>recherche</b> et les filtres (type, catégorie) pour retrouver une opération.</p>
      ${tip('Astuce', 'Sur ordinateur, appuyez sur la touche <b>N</b> pour ajouter une transaction, et sur <b>Ctrl + K</b> pour aller n\'importe où en quelques lettres.')}
    </div>
  </div>
`));

// 8 · Famille
pages.push(page(7, 'Ajouter un membre de la famille', 'Chacun a son propre accès, avec exactement les droits que vous choisissez.', 'Users', '#EC4899', `
  <div class="flow">
    <div class="flow-i"><div class="flow-h"><span class="badge sm">1</span> Le membre crée son accès</div>${phone('s04-code-demande', { w: 52, callouts: [[1, 100, 61], [2, 100, 69.5], [3, 100, 76]] })}
      ${legend(['Voici le <b>code</b> de la demande.', '<b>WhatsApp</b> ou <b>Copier</b> : envoyez-le à l\'administrateur.', 'L\'écran se met à jour tout seul dès la validation.'])}</div>
    <div class="flow-arrow">${ic('ArrowRight', 26, '#94a3b8')}</div>
    <div class="flow-i"><div class="flow-h"><span class="badge sm">2</span> L'administrateur valide</div>${phone('s12-valider-demande', { w: 52, callouts: [[1, 100, 24], [2, 100, 40], [3, 100, 69]] })}
      ${legend(['Budget Famille → icône <b>clé</b> : saisissez le code, vérifiez le <b>nom</b> et le <b>numéro</b>.', '<b>Rattachez</b> la personne à un membre existant, ou créez-en un.', 'Choisissez ses <b>droits</b>, puis <b>« Valider l\'accès »</b>.'])}</div>
    <div class="flow-arrow">${ic('ArrowRight', 26, '#94a3b8')}</div>
    <div class="flow-i"><div class="flow-h"><span class="badge sm">3</span> Le membre est actif</div>${phone('s22-espace-membre', { w: 52, callouts: [[1, 100, 21], [2, 100, 33]] })}
      ${legend(['Son espace : l\'argent dépensé ce mois-ci.', '<b>« Ajouter une dépense »</b> : elle apparaît dans le budget famille.'])}</div>
  </div>
  <h2 class="h2">Les droits, en clair</h2>
  <table class="rights">
    <tr><th></th><th>Voir ses dépenses</th><th>Saisir ses dépenses</th><th>Voir toute la famille</th></tr>
    <tr><td><b>Enfant</b></td><td class="y">✓</td><td class="n">—</td><td class="n">—</td></tr>
    <tr><td><b>Adolescent</b></td><td class="y">✓</td><td class="y">✓</td><td class="n">—</td></tr>
    <tr><td><b>Conjoint</b></td><td class="y">✓</td><td class="y">✓</td><td class="y">✓</td></tr>
  </table>
  <p class="small">Vous pouvez ensuite <b>suspendre</b>, <b>rétablir</b> ou <b>retirer</b> un accès, ou donner un <b>mot de passe provisoire</b>, depuis la fiche du membre dans Budget Famille. Vos revenus personnels ne sont <b>jamais</b> visibles par les membres.</p>
`));

// 9 · Budgets Perso & Pro
pages.push(page(8, 'Budgets Perso & Pro', 'Un budget par projet : vous créez vos catégories, vous voyez ce qui reste en temps réel.', 'Briefcase', '#8B5CF6', `
  <div class="three-ph">
    <div class="ph-i">${phone('s14-budgets', { w: 55, callouts: [[1, 66, 22.5], [2, 100, 43], [3, 100, 86]] })}
      ${legend(['<b>« Nouveau budget »</b> : Personnel ou Professionnel, nom, montant, catégories, fonds reçus.', 'Filtrez : <b>Tous</b>, <b>Personnel</b>, <b>Professionnel</b>.', 'Touchez un budget pour l\'ouvrir.'])}</div>
    <div class="ph-i">${phone('s15-budget-detail', { w: 55, callouts: [[1, 62, 32.5], [2, 62, 38.8], [3, 90, 34.5], [4, 30, 48], [5, 100, 55]] })}
      ${legend(['<b>Nouvelle dépense</b>.', '<b>Recevoir des fonds</b> (argent reçu pour ce projet).', '<b>Excel</b>, <b>justificatifs en ZIP</b>, <b>impression PDF</b>.', '<b>Partager</b>, historique, modifier, clôturer.', 'Budget prévu, dépensé, <b>reste à dépenser</b> et solde en caisse.'])}</div>
    <div class="ph-i">${phone('s16-depense-justificatif', { w: 55, callouts: [[1, 100, 70], [2, 72, 75.6], [3, 72, 81], [4, 100, 90.5]] })}
      ${legend(['Le justificatif joint (photo ou PDF).', '<b>Joindre un justificatif</b> depuis votre galerie.', '<b>Prendre une photo</b> du reçu avec l\'appareil.', '<b>Enregistrer</b>.'])}</div>
  </div>
  ${tip('Pensez comptable', 'Pour chaque dépense, renseignez le bénéficiaire, le numéro de pièce et le mode de paiement : votre export Excel et votre archive de justificatifs sont alors prêts à remettre au comptable ou au DAF.')}
`));

// 10 · Partager
pages.push(page(9, 'Travailler avec un comptable ou un associé', 'Partagez un budget sans partager le reste de vos finances.', 'Share2', '#6366F1', `
  <div class="phone-row start">
    ${phone('s24-partage', { w: 58, callouts: [[1, 100, 23], [2, 100, 59], [3, 100, 68], [4, 100, 80]] })}
    <div class="grow">
      <p class="intro small-top">Dans un budget, touchez l'icône <b>Partage</b> :</p>
      ${legend(['<b>Validation des dépenses</b> : les dépenses saisies par les autres restent « en attente » jusqu\'à votre accord.', 'Écrivez l\'<b>e-mail</b> de la personne (elle doit avoir un compte FinTrack).', 'Choisissez <b>Saisie</b> (elle peut ajouter des dépenses) ou <b>Lecture</b> (elle regarde seulement).', '<b>Inviter</b> : le budget apparaît chez elle dans « Partagés avec moi ».'])}
      <table class="rights roles">
        <tr><th></th><th>Voir le budget</th><th>Ajouter des dépenses</th><th>Valider et gérer</th></tr>
        <tr><td><b>Lecture</b></td><td class="y">✓</td><td class="n">—</td><td class="n">—</td></tr>
        <tr><td><b>Saisie</b></td><td class="y">✓</td><td class="y">✓</td><td class="n">—</td></tr>
        <tr><td><b>Propriétaire</b></td><td class="y">✓</td><td class="y">✓</td><td class="y">✓</td></tr>
      </table>
      ${tip('Vous gardez la main', 'Seul le propriétaire du budget peut le modifier, valider ou refuser les dépenses, et retirer un accès. Vos autres budgets restent privés.')}
    </div>
  </div>
  <div class="phone-row start">
    ${phone('s25-historique', { w: 58, win: [0.15, 0.82], callouts: [[1, 100, 38]] })}
    <div class="grow">
      <h2 class="h2 first">Un historique qui ne triche pas</h2>
      ${legend(['Chaque action est enregistrée automatiquement : <b>qui</b> a saisi, validé, invité, joint un justificatif, et <b>quand</b>. Personne ne peut effacer cet historique.'])}
      <p class="small">Utile pour rendre des comptes en fin de mission ou lors d'un contrôle.</p>
    </div>
  </div>
`));

// 11 · Hors ligne, rapports, objectifs
pages.push(page(10, 'Hors ligne, rapports et objectifs', 'Continuez à noter vos dépenses si le réseau coupe, et suivez vos progrès.', 'BarChart3', '#06B6D4', `
  <div class="three-ph">
    <div class="ph-i"><div class="flow-h">${ic('WifiOff', 16)} Sans réseau</div>${phone('s17-hors-ligne', { w: 55, callouts: [[1, 100, 56]] })}
      ${legend(['Hors connexion, votre dépense est <b>gardée sur le téléphone</b> et envoyée automatiquement au retour du réseau, une seule fois.'])}</div>
    <div class="ph-i"><div class="flow-h">${ic('BarChart3', 16)} Rapports</div>${phone('s18-rapports', { w: 55, callouts: [[1, 100, 11], [2, 100, 21]] })}
      ${legend(['Choisissez <b>Ce mois</b>, <b>Ce trimestre</b> ou <b>Cette année</b>.', 'Comparez à la <b>période précédente</b> (hausse ou baisse).'])}</div>
    <div class="ph-i"><div class="flow-h">${ic('Target', 16)} Objectifs</div>${phone('s19-objectifs', { w: 55, callouts: [[1, 100, 13], [2, 100, 52]] })}
      ${legend(['<b>Nouvel Objectif</b> : « Rentrée scolaire », « Voyage au village »…', '<b>Contribuer</b> pour ajouter une somme et voir la progression.'])}</div>
  </div>
  ${tip('Quand le réseau coupe', 'Si le réseau coupe pendant que vous travaillez, FinTrack garde vos dépenses de <b>Budgets Perso & Pro</b> sur le téléphone et les envoie au retour du réseau. Pour consulter vos chiffres à jour ou ajouter une transaction classique, il faut une connexion, même faible.', 'tip')}
`));

// 12 · Sécurité
pages.push(page(11, 'Sécurité : protégez votre argent', 'Trois réglages simples qui font toute la différence.', 'ShieldCheck', '#10B981', `
  <div class="phone-row start">
    ${phone('s20-coffre-fort', { w: 56, callouts: [[1, 100, 40], [2, 100, 49], [3, 100, 60]] })}
    <div class="grow">
      <h2 class="h2 first">Le coffre-fort</h2>
      ${legend(['Choisissez un <b>mot de passe maître</b> (8 caractères minimum).', '<b>Confirmez-le</b>.', 'Cochez la case puis <b>« Créer mon coffre »</b>.'])}
      <p class="small">Vos mots de passe et notes y sont <b>chiffrés</b> : même nous ne pouvons pas les lire. <b>Attention : si vous oubliez le mot de passe maître, il est impossible de les récupérer.</b></p>
    </div>
  </div>
  <div class="phone-row start">
    ${phone('s26-securite', { w: 56, callouts: [[1, 100, 19], [2, 100, 36]] })}
    <div class="grow">
      <h2 class="h2 first">Mot de passe et double authentification</h2>
      ${legend(['<b>Modifier</b> votre mot de passe régulièrement, et ne le partagez jamais.', '<b>Activer</b> la double authentification : un code temporaire (application d\'authentification) est demandé en plus du mot de passe.'])}
      <div class="dd"><div><h3 class="ok">${ic('Check', 15)} À faire</h3><ul><li>Un mot de passe long, différent pour chaque service</li><li>Activer la double authentification</li><li>Vous déconnecter sur un téléphone prêté</li></ul></div>
      <div><h3 class="ko">${ic('X', 15)} Jamais</h3><ul><li>Donner votre mot de passe, même à un proche</li><li>Envoyer un code de demande à un inconnu</li><li>Noter le mot de passe maître sur le téléphone</li></ul></div></div>
    </div>
  </div>
`));

// 13 · FAQ
pages.push(page(12, 'Questions fréquentes', 'Une réponse rapide aux situations les plus courantes.', 'CircleHelp', '#F59E0B', `
  <div class="faq">
    ${[
      ['J\'ai oublié mon mot de passe.', 'Sur l\'écran de connexion, touchez « Mot de passe oublié ? » et suivez l\'e-mail reçu. Si vous vous connectez par téléphone, demandez un mot de passe provisoire à l\'administrateur de votre famille.'],
      ['Je n\'ai pas d\'adresse e-mail.', 'Choisissez « Rejoindre ma famille » : votre nom et votre numéro de téléphone suffisent, avec la validation de l\'administrateur.'],
      ['Mon accès est « en attente ».', 'C\'est normal tant que l\'administrateur n\'a pas validé le code. Renvoyez-lui le code par WhatsApp : l\'écran se met à jour tout seul dès qu\'il valide.'],
      ['L\'application ne s\'installe pas sur iPhone.', 'Utilisez bien Safari (pas Chrome), puis Partager → « Sur l\'écran d\'accueil ». Les navigateurs intégrés à WhatsApp ou Facebook ne le permettent pas : ouvrez le lien dans Safari.'],
      ['Puis-je noter une dépense sans internet ?', 'Oui, dans un Budget Perso & Pro, si le réseau coupe pendant que vous y êtes : la dépense est gardée sur le téléphone et envoyée toute seule au retour du réseau. Pour une transaction classique, il faut une connexion.'],
      ['Comment changer de langue ou de devise ?', 'Menu → Paramètres : le français et l\'anglais, et les devises FCFA, euro ou dollar.'],
      ['J\'ai fait une erreur de saisie.', 'Dans la liste, touchez le crayon pour corriger ou la corbeille pour supprimer la ligne.'],
      ['Mes données sont-elles privées ?', 'Oui. Chaque compte ne voit que ses propres données, les justificatifs sont stockés dans un espace privé, et le coffre-fort est chiffré. Un budget n\'est partagé que si vous l\'invitez.'],
    ].map(([q, a]) => `<div class="qa"><div class="q">${ic('CircleHelp', 16, '#F59E0B')} ${q}</div><div class="a">${a}</div></div>`).join('')}
  </div>
  <h2 class="h2">Aide-mémoire : où trouver quoi ?</h2>
  <table class="cheat">
    ${[
      ['Noter une dépense', 'Menu → Transactions → Nouvelle Transaction'],
      ['Voir mes soldes', 'Menu → Mes Comptes'],
      ['Ajouter un membre de la famille', 'Menu → Budget Famille → Ajouter un Membre'],
      ['Valider l\'accès d\'un membre', 'Budget Famille → icône clé → saisir le code'],
      ['Suivre une mission ou un projet', 'Menu → Budgets Perso & Pro'],
      ['Remettre les pièces au comptable', 'Dans le budget : Excel et Justificatifs (ZIP)'],
      ['Changer mon avatar ou mon nom', 'Mon avatar (en haut) → Modifier mon profil'],
      ['Installer l\'application', 'Menu → Paramètres → Application mobile'],
    ].map(([a, b]) => `<tr><td>${a}</td><td>${ic('ArrowRight', 13, '#94a3b8')}</td><td><b>${b}</b></td></tr>`).join('')}
  </table>
  <div class="closing">
    <div class="closing-logo">${LOGO}</div>
    <div><b>Besoin d'aide ou d'une idée d'amélioration ?</b><br>Parlez-en à l'administrateur de votre famille, ou rendez-vous sur <b>www.joyeds.com</b>.<br><span>Ce guide est aussi disponible dans l'application : Menu → Paramètres → Guide d'utilisation (il s'ouvre ensuite sans connexion).</span></div>
  </div>
`));

// ---------- feuille de style ----------
const css = `
@font-face{font-family:'InterV';src:url('file:///${FONT_DIR}/inter-latin-wght-normal.woff2') format('woff2');font-weight:100 900;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'InterV';src:url('file:///${FONT_DIR}/inter-latin-ext-wght-normal.woff2') format('woff2');font-weight:100 900;unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'InterV','Inter',system-ui,sans-serif;color:#1e293b;font-size:10pt;line-height:1.42;background:#fff}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.page:last-child{page-break-after:auto}
svg{display:inline-block;vertical-align:middle}
b{font-weight:650}
.top{height:34mm;background:linear-gradient(120deg,#0F172A,#1E293B 70%,#12324a);display:flex;align-items:center;gap:6mm;padding:0 14mm;color:#fff;position:relative}
.top::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1.4mm;background:linear-gradient(90deg,#3B82F6,#10B981)}
.top-num{width:15mm;height:15mm;border-radius:5mm;display:flex;align-items:center;justify-content:center;font-size:20pt;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 2mm 5mm rgba(0,0,0,.3)}
.top-txt{flex:1}
.top-txt h1{font-size:19pt;font-weight:800;letter-spacing:-.01em;line-height:1.15}
.top-txt p{font-size:9.5pt;color:#cbd5e1;margin-top:1mm}
.top-ic{background:#fff;border-radius:5mm;padding:2.6mm;display:flex;opacity:.95}
.body{padding:8mm 14mm 0;height:calc(297mm - 34mm - 12mm)}
.foot{position:absolute;left:14mm;right:14mm;bottom:5mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#94a3b8;border-top:.3mm solid #e2e8f0;padding-top:2mm}
.foot .pw b{color:#3B82F6}
.intro{font-size:10.5pt;margin-bottom:4mm}
.intro.small-top{margin-bottom:3mm}
.small{font-size:9pt;color:#475569;margin:3mm 0}
.h2{font-size:12.5pt;font-weight:800;margin:6mm 0 3mm;color:#0F172A;display:flex;align-items:center;gap:2mm}
.h2.first{margin-top:0}
.h2::before{content:'';width:1.6mm;height:5mm;border-radius:1mm;background:linear-gradient(#3B82F6,#10B981)}
.badge{position:absolute;transform:translate(-50%,-50%);width:6.6mm;height:6.6mm;border-radius:50%;background:#F59E0B;color:#fff;font-weight:800;font-size:9pt;display:flex;align-items:center;justify-content:center;border:.5mm solid #fff;box-shadow:0 .6mm 2mm rgba(0,0,0,.4);z-index:3}
.badge.sm{position:static;transform:none;width:5.4mm;height:5.4mm;font-size:8pt;flex-shrink:0;box-shadow:none;border:none;margin-top:.3mm}
.badge.plain{background:#94a3b8}
.phone{background:#0b1220;border-radius:7.5mm;padding:1.7mm;box-shadow:0 3mm 8mm rgba(15,23,42,.28);position:relative;flex-shrink:0}
.phone .wrap{position:relative}
.phone .screen{position:relative;border-radius:6mm;overflow:hidden;background:#fff;line-height:0}
.phone img{width:100%;display:block}
.phone.big{padding:2.4mm;border-radius:10mm}.phone.big .screen{border-radius:8mm}
.legend,.steps{list-style:none;display:flex;flex-direction:column;gap:2.4mm;font-size:9.2pt}
.legend li,.steps li{display:flex;gap:2.4mm;align-items:flex-start}
.phone-row{display:flex;gap:6mm;align-items:flex-start}
.phone-row.start{margin-bottom:6mm}
.grow{flex:1;min-width:0}
.note{display:flex;gap:3mm;align-items:flex-start;border-radius:3mm;padding:3mm 4mm;font-size:9pt;margin-top:4mm}
.note.tip{background:#ecfdf5;border:.3mm solid #a7f3d0;color:#065f46}
.note.warn{background:#fffbeb;border:.3mm solid #fde68a;color:#92400e}
.note-ic{flex-shrink:0;margin-top:.4mm}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm;margin-bottom:2mm}
.tile{display:flex;gap:3.5mm;align-items:flex-start;border:.3mm solid #e2e8f0;border-radius:4mm;padding:3.6mm;background:#fff}
.tile-ic{width:12mm;height:12mm;border-radius:3.4mm;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tile p{font-size:8.8pt;color:#475569;margin-top:.6mm}
.lex{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.lex>div{border-left:.9mm solid #3B82F6;background:#f8fafc;border-radius:0 3mm 3mm 0;padding:2.6mm 3.6mm;font-size:9pt}
.lex p{color:#475569;font-size:8.6pt;margin-top:.6mm}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.three-i{border-radius:4mm;padding:4.5mm;background:linear-gradient(160deg,#f8fafc,#eef2ff);border:.3mm solid #e2e8f0;position:relative}
.three-i .big{font-size:26pt;font-weight:800;line-height:1;background:linear-gradient(135deg,#3B82F6,#10B981);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:2mm}
.three-i p{font-size:8.8pt;color:#475569;margin:1mm 0 6mm}
.three-i .pg{position:absolute;left:4.5mm;bottom:3.5mm;font-size:8pt;font-weight:700;color:#3B82F6}
.os{margin-bottom:5.5mm}
.os-h{display:flex;align-items:center;gap:3mm;margin-bottom:2.5mm}
.os-h small{color:#64748b;font-size:8.8pt}
.os-tag{display:inline-flex;align-items:center;gap:1.6mm;color:#fff;font-weight:700;font-size:9.5pt;padding:1.4mm 3.4mm;border-radius:6mm}
.minis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.minis.two{grid-template-columns:1fr 1fr 1.9fr}
.side-tip{grid-column:3}.side-tip .note{margin-top:0;height:100%}
.mini{display:flex;flex-direction:column;gap:2mm}
.mini-mock{height:34mm;border-radius:3.4mm;background:linear-gradient(160deg,#f1f5f9,#e2e8f0);border:.3mm solid #cbd5e1;padding:2.4mm;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:center;gap:1.8mm;font-size:6.8pt;line-height:1.25}
.mini-cap{display:flex;gap:1.8mm;font-size:8pt;color:#334155;align-items:flex-start;min-height:12mm}
.hl{background:#fde68a!important;box-shadow:0 0 0 .5mm #F59E0B;border-radius:1.4mm;font-weight:700;color:#7c2d12}
.ring{outline:.6mm solid #F59E0B;outline-offset:.5mm;border-radius:50%}
.bar{display:flex;align-items:center;gap:1.4mm;background:#fff;border-radius:6mm;padding:1.4mm 2.2mm;font-size:6.6pt;color:#334155;border:.2mm solid #cbd5e1}
.bar .url{flex:1;overflow:hidden;white-space:nowrap}.bar .dots{display:flex;padding:.4mm}
.bar.pc{border-radius:1.6mm}
.page-skel{display:flex;flex-direction:column;gap:1.6mm;padding:1mm}
.page-skel i{display:block;height:2.4mm;border-radius:1mm;background:#cbd5e1}
.page-skel.tall{margin-bottom:6mm}
.menu{list-style:none;background:#fff;border-radius:2mm;padding:1mm;box-shadow:0 1mm 3mm rgba(0,0,0,.18);display:flex;flex-direction:column;gap:.6mm}
.menu li{padding:1.1mm 1.8mm;color:#334155;display:flex;align-items:center;gap:1.4mm}
.menu.ios li{padding:1.4mm 1.8mm}
.dialog{background:#fff;border-radius:2.4mm;padding:2.6mm;box-shadow:0 1mm 3mm rgba(0,0,0,.18);display:flex;flex-direction:column;gap:2.2mm}
.d-title{display:flex;gap:2mm;align-items:center}.d-title small{color:#64748b}
.d-ic{width:8mm;height:8mm;display:block;flex-shrink:0}.d-ic svg{width:100%;height:100%}
.d-btns{display:flex;justify-content:flex-end;gap:2mm}.d-btns span{padding:1mm 2.4mm;border-radius:1.4mm;color:#3B82F6;font-weight:600}
.ios-bar{position:absolute;left:0;right:0;bottom:0;background:#f8fafc;border-top:.2mm solid #cbd5e1;display:flex;justify-content:space-around;align-items:center;padding:2mm 1mm;color:#3B82F6}
.ios-bar .ring{display:flex;padding:.8mm}
.ios-add{background:#fff;border-radius:2.4mm;padding:2mm;box-shadow:0 1mm 3mm rgba(0,0,0,.18)}
.ia-top{display:flex;justify-content:space-between;align-items:center;padding-bottom:1.8mm;color:#3B82F6;font-size:6.2pt}.ia-top b{color:#0f172a}
.ia-top .hl{padding:.6mm 1.4mm}
.ia-row{display:flex;gap:2mm;align-items:center;background:#f1f5f9;border-radius:1.6mm;padding:1.6mm}
.ia-name{font-weight:600;color:#0f172a}
.grid-apps{display:grid;grid-template-columns:repeat(3,1fr);gap:1.8mm}
.app{display:flex;flex-direction:column;align-items:center;gap:.8mm;font-size:5.4pt;color:#334155;padding:.8mm}
.app-ic{width:9mm;height:9mm;border-radius:2.4mm;background:#cbd5e1}
.app-ic svg{width:100%;height:100%}
.app.hl .app-ic{background:none}
.perks{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.perks>div{border:.3mm solid #e2e8f0;border-radius:3.4mm;padding:3.2mm;display:flex;flex-direction:column;gap:1.2mm;font-size:8.4pt;color:#475569}
.perks b{color:#0f172a;font-size:9.2pt}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:7mm}
.cols2.gap{gap:9mm}
.who{display:flex;align-items:center;gap:2mm;font-weight:700;font-size:9.4pt;padding:2.4mm 3.4mm;border-radius:3mm;margin-bottom:4mm}
.col .phone-row{flex-direction:column;align-items:center;gap:4.5mm}
.col .legend,.col .steps{align-self:stretch}
.flow{display:grid;grid-template-columns:1fr 8mm 1fr 8mm 1fr;align-items:start;margin-bottom:2mm}
.flow-i{display:flex;flex-direction:column;align-items:center;gap:3mm}
.flow-i .legend{align-self:stretch;font-size:8.4pt}
.flow-h{display:flex;align-items:center;gap:2mm;font-weight:800;font-size:9.4pt}
.flow-arrow{display:flex;justify-content:center;align-self:center;margin-top:30mm}
.rights{width:100%;border-collapse:collapse;font-size:9.2pt;margin-bottom:2mm}
.rights th{font-size:8.2pt;color:#64748b;font-weight:600;padding:1.8mm;text-align:center}
.rights td{padding:2.2mm 3mm;text-align:center;border-top:.3mm solid #e2e8f0}
.rights td:first-child{text-align:left}
.rights.roles{font-size:8.4pt;margin-top:3mm}.rights.roles th{font-size:7.4pt}.rights.roles td{padding:1.6mm 2mm}
.rights .y{color:#059669;font-weight:800;font-size:11pt}.rights .n{color:#cbd5e1}
.three-ph{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-bottom:2mm}
.ph-i{display:flex;flex-direction:column;align-items:center;gap:3.4mm}
.ph-i .legend{align-self:stretch;font-size:8.4pt}
.desk{max-height:78mm;border-radius:3mm;overflow:hidden;border:.3mm solid #cbd5e1;box-shadow:0 2mm 6mm rgba(15,23,42,.18);line-height:0}
.desk img{width:100%}
.dd{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:4mm}
.dd h3{font-size:9.6pt;display:flex;align-items:center;gap:1.6mm;margin-bottom:1.6mm}
.dd .ok{color:#059669}.dd .ko{color:#dc2626}
.dd ul{padding-left:4mm;font-size:8.6pt;color:#475569;display:flex;flex-direction:column;gap:1.2mm}
.faq{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.qa{border:.3mm solid #e2e8f0;border-radius:3.4mm;padding:3.2mm 3.6mm;background:#fff}
.q{font-weight:700;font-size:9.2pt;display:flex;gap:1.8mm;align-items:flex-start;margin-bottom:1.2mm}
.q svg{flex-shrink:0;margin-top:.3mm}
.a{font-size:8.6pt;color:#475569}
.cheat{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:2mm}.cheat td{padding:1.5mm 2.4mm;border-top:.3mm solid #e2e8f0}.cheat td:nth-child(2){width:8mm;text-align:center}.cheat td:first-child{width:62mm;color:#475569}
.closing{display:flex;gap:5mm;align-items:center;margin-top:4mm;padding:4mm 5mm;border-radius:4mm;background:linear-gradient(120deg,#0F172A,#1E293B);color:#e2e8f0;font-size:9.4pt}
.closing b{color:#fff}.closing span{color:#94a3b8;font-size:8.4pt}
.closing-logo{width:16mm;height:16mm;flex-shrink:0}.closing-logo svg{width:100%;height:100%}
/* couverture */
.cover{background:linear-gradient(150deg,#0b1220,#0F172A 55%,#102a43);color:#fff;display:flex}
.glow{position:absolute;border-radius:50%;filter:blur(30mm)}
.g1{width:120mm;height:120mm;left:-30mm;top:-20mm;background:rgba(59,130,246,.35)}
.g2{width:110mm;height:110mm;right:-40mm;bottom:-10mm;background:rgba(16,185,129,.3)}
.cover-left{position:relative;z-index:2;width:112mm;padding:22mm 0 16mm 16mm;display:flex;flex-direction:column}
.cover-logo{width:24mm;height:24mm;margin-bottom:8mm;filter:drop-shadow(0 2mm 4mm rgba(0,0,0,.4))}.cover-logo svg{width:100%;height:100%}
.kicker{font-weight:800;letter-spacing:.3em;text-transform:uppercase;font-size:9pt;color:#6ee7b7;margin-bottom:3mm}
.cover h1{font-size:38pt;line-height:1.02;font-weight:800;letter-spacing:-.02em;margin-bottom:6mm}
.lead{font-size:12pt;color:#cbd5e1;line-height:1.45;margin-bottom:9mm}
.cover-points{list-style:none;display:flex;flex-direction:column;gap:3.4mm;margin-bottom:10mm}
.cover-points li{display:flex;gap:3mm;align-items:center;font-size:9.6pt;color:#e2e8f0}
.cover-points svg{color:#34d399;flex-shrink:0}
.cover-qr{display:flex;gap:4mm;align-items:center;background:rgba(255,255,255,.07);border:.3mm solid rgba(255,255,255,.15);border-radius:4mm;padding:3.4mm;font-size:9pt;margin-top:auto}
.cover-qr .qr{width:24mm;height:24mm;background:#fff;border-radius:2.4mm;padding:2mm;flex-shrink:0}.cover-qr .qr svg{width:100%;height:100%}
.cover-qr span{color:#94a3b8;font-size:8pt}
.cover-foot{margin-top:6mm;font-size:8.4pt;color:#94a3b8}.cover-foot b{color:#60a5fa}
.cover-right{position:relative;z-index:2;flex:1;display:flex;align-items:center;justify-content:center;padding:14mm 8mm 10mm 0}
`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>FinTrack — Guide d'utilisation</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`;
fs.writeFileSync(path.join(OUT_DIR, 'guide.html'), html);

const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.goto('file:///' + path.join(OUT_DIR, 'guide.html').replace(/\\/g, '/'));
await pg.evaluate(() => document.fonts.ready);
await pg.waitForTimeout(600);
const pdfPath = path.join(OUT_DIR, 'FinTrack-Guide-Utilisation.pdf');
await pg.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('PDF :', pdfPath, (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2), 'Mo,', pages.length, 'pages');
