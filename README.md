# Axial Campaign Content for Pathfinder 1st Edition

Shared Foundry VTT compendium module for the Axial campaign (PF1e system).

## Setup

1. Clone this repo into your Foundry `Data/modules/` directory
2. Install dependencies: `npm install`
3. Configure the fvtt CLI with your data path:
   ```
   npx fvtt configure set dataPath "path/to/your/FoundryVTT/Data"
   ```
4. Build the packs: `npm run pack`
5. Enable the module in your Foundry world

## Workflow

### After editing compendiums in Foundry

```bash
npm run unpack       # extracts LevelDB packs into JSON files in src/
git add src/
git commit -m "describe your changes"
git push
```

### After pulling a collaborator's changes

```bash
git pull
npm run pack         # rebuilds LevelDB packs from JSON source
```

Then restart your Foundry world to pick up the changes.

## Packs

| Pack | Type | Contents |
|------|------|----------|
| `equipment` | Item | Weapons, armor, gear, etc. |
| `bestiary` | Actor | Creatures and NPCs |
