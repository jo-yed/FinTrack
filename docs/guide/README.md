# Guide d'utilisation (PDF)

Le guide illustré (13 pages, A4) est servi par l'application à l'adresse `/guide-fintrack.pdf`
(fichier `public/guide-fintrack.pdf`). Il est lié depuis l'écran de connexion et depuis
**Paramètres → Application mobile → Guide d'utilisation**, et le service worker le garde en cache
dès la première ouverture : il se lit ensuite sans connexion.

## Régénérer le PDF

`build-guide.mjs` assemble la mise en page (HTML) à partir des captures d'écran de `shots/`
puis l'imprime en PDF avec Playwright. Il lui faut `playwright` et `qrcode`
(installés à part, hors du projet) et les icônes de `lucide-react`.

```bash
node build-guide.mjs <dossier>   # <dossier> contient guide.html, shots/ et reçoit le PDF
```

Les captures ont été prises sur la version en production avec des données fictives
(famille « Fouda », budget « Mission Douala »). Après un changement visible de l'interface,
refaites les captures concernées (mobile 390 × 844, échelle 2), recompressez-les (largeur 620 px,
JPEG 80 %) et relancez la commande ci-dessus, puis copiez le PDF dans `public/`.
