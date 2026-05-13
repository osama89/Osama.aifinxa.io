# Graph Report - Osama.aifinxa.io  (2026-05-12)

## Corpus Check
- 50 files · ~296,101 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 169 nodes · 242 edges · 25 communities (16 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1255735`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `pseudoNoise()` - 3 edges
2. `makeLobeGeometry()` - 3 edges
3. `playfair` - 2 edges
4. `inter` - 2 edges
5. `mono` - 2 edges
6. `metadata` - 2 edges
7. `RootLayout()` - 2 edges
8. `NeuralBrain` - 2 edges
9. `Home()` - 2 edges
10. `PhotoIntelligence` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (25 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (32): AmbientSparkles(), BrainHemispheres(), BrainScene(), CameraDolly(), COG_STATES, CognitiveCore(), CogState, CrossBridges() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (16): Home(), NeuralBrain, Contact(), BOOT_LINES, Loader(), ITEMS, Marquee(), links (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.26
Nodes (12): AgentNetwork(), AgentNode, D(), Edge, EDGES, LogEntry, MAIN_COG, MAIN_VERBS (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.3
Nodes (10): AmbientField(), CameraDolly(), CardProps, CYAN, DollyProps, GOLD, PhotoCard(), PhotoIntelligence() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.33
Nodes (9): AI_SKILLS, BI_SKILLS, BUILDS, DEV_SKILLS, HorizontalScroll(), PanelAI(), PanelBI(), PanelBuilds() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.31
Nodes (6): inter, metadata, mono, playfair, RootLayout(), CustomCursor()

### Community 6 - "Community 6"
Cohesion: 0.48
Nodes (5): AgentNetwork, AnimatedRole(), Hero(), ROLES, STATS

### Community 7 - "Community 7"
Cohesion: 0.53
Nodes (4): About(), EXPERIENCE, PARTICLES, PhotoIntelligence

### Community 8 - "Community 8"
Cohesion: 0.6
Nodes (3): CARDS, Gallery(), GalleryCard()

### Community 9 - "Community 9"
Cohesion: 0.6
Nodes (3): KEY_BUILDS, SKILL_GROUPS, Skills()

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **15 isolated node(s):** `eslintConfig`, `nextConfig`, `config`, `eslintConfig`, `nextConfig` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `eslintConfig`, `nextConfig`, `config` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._