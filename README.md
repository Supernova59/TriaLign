# Tripath

> Comparer des séquences biologiques à deux ou à trois, et voir où elles se ressemblent.

Tripath est une application web pédagogique d'alignement de séquences biologiques. Elle vise à comparer des séquences d'ADN, d'ARN ou de protéines et à rendre les algorithmes d'alignement compréhensibles grâce à des visualisations interactives.

Le projet fonctionne entièrement dans le navigateur. Il est destiné à l'exploration et à l'apprentissage, et non au remplacement d'outils spécialisés comme MAFFT ou Clustal pour de grandes séquences.

## État du projet

Le projet est actuellement en développement.

Fonctionnel :

- application React/TypeScript démarrable avec Vite ;
- import et parsing basique de séquences FASTA ;
- alignement global de deux séquences avec l'algorithme de Needleman-Wunsch ;
- affichage texte de l'alignement ;
- test automatisé et build de production.

En préparation :

- alignements semi-global et local ;
- alignement exact de trois séquences ;
- dotplots 2D ;
- visualisation 3D du cube de programmation dynamique ;
- dotpath et nuage de k-mers ;
- récupération de séquences depuis NCBI et UniProt ;
- exécution des calculs lourds dans un Web Worker.

## Fonctionnalités prévues

### Alignement

| Méthode | Deux séquences | Trois séquences |
| --- | :---: | :---: |
| Global (Needleman-Wunsch) | En cours | Prévu |
| Semi-global | Prévu | Prévu |
| Local (Smith-Waterman) | Prévu | Prévu |

### Visualisations

- alignement texte coloré ;
- dotplot 2D pour chaque paire ;
- cube 3D de programmation dynamique et chemin optimal ;
- nuage 3D des k-mers partagés ;
- dotpath sous forme de rubans ;
- matrice d'identité entre les séquences.

## Architecture

```text
src/
├── core/                 # Algorithmes purs, indépendants de React et du navigateur
│   ├── alignment/        # Alignements et fonctions de score
│   └── types.ts          # Types partagés
├── data/                 # Parsing FASTA et futures sources NCBI/UniProt
├── workers/              # Calculs lourds hors du thread de l'interface
├── viz/                  # Composants de visualisation réutilisables
├── tools/                # Outils de comparaison organisés par fonctionnalité
├── components/           # Composants d'interface communs
├── App.tsx               # Application principale
└── main.tsx              # Point d'entrée React

tests/
└── core/                 # Tests des algorithmes
```

Les algorithmes de `core/` ne doivent pas dépendre de React. Cette séparation permet de les tester indépendamment et facilite une éventuelle réécriture en WebAssembly.

## Installation

Pré-requis :

- Node.js 20 ou une version compatible ;
- npm.

Cloner le dépôt puis installer les dépendances :

```bash
git clone <url-du-depot>
cd TriaLign
npm install
```

## Développement

Lancer le serveur de développement :

```bash
npm run dev
```

Vite affiche ensuite l'adresse locale, généralement `http://localhost:5173`.

## Tests et vérifications

Lancer les tests :

```bash
npm test
```

Lancer les tests en mode surveillance :

```bash
npm run test:watch
```

Vérifier le build de production :

```bash
npm run build
```

Le résultat compilé est placé dans `dist/`. Pour le prévisualiser localement :

```bash
npm run build
npm exec vite preview
```

La CI exécute automatiquement les tests et le build lors des pushes et des pull requests.

## Déploiement

Tripath produit un site statique. Le dossier `dist/` peut être déployé sur Cloudflare Pages, Netlify ou GitHub Pages.

Configuration habituelle pour Cloudflare Pages ou Netlify :

```text
Commande de build : npm run build
Dossier de sortie : dist
Version Node       : 20
```

Les calculs sont destinés à rester dans le navigateur. Les futures requêtes vers NCBI et UniProt devront valider les identifiants, gérer les limites de requêtes et ne jamais exposer de secret côté client.

## Limites

Un alignement exact de trois séquences nécessite une matrice de taille `n × m × p`. Le coût mémoire et le temps de calcul augmentent donc très rapidement. L'interface devra limiter la taille des séquences et utiliser un Web Worker pour éviter de bloquer la page.

## Contribuer

Les suggestions et retours sont bienvenus via les issues et les pull requests. Avant de proposer une modification :

1. respecter la séparation entre `core`, interface et visualisations ;
2. ajouter ou mettre à jour les tests concernés ;
3. vérifier `npm test` et `npm run build` ;
4. documenter les changements visibles dans le README si nécessaire.

## Licence

MIT
