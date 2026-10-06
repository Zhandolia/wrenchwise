# Third-party vehicle assets

The application code and original procedural geometry are MIT-licensed. **The following vehicle geometry is CC BY 4.0, not MIT.** Lexus/Toyota trademarks and manufacturer photographs are not covered by either grant. No manufacturer endorsement is implied.

| Asset | Creator and source | License |
|---|---|---|
| GS 300 reference exterior/interior; derived GS 400 / GS 430 exteriors; exterior incorporated in GS 300 assembly v4 | [David_Holiday — Lexus GS300](https://sketchfab.com/3d-models/0bc00c7cd32c4d6da2098fbc2ab1eff0) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| RX 300 reference exterior/interior | [David_Holiday — Lexus RX300](https://sketchfab.com/3d-models/6f2f754c78794734b794237913ba97cc) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

These assets were obtained through the public Allen Institute Objaverse distribution. Attribution, source URLs, download hashes, license URLs, and modifications are recorded in `research/asset-licenses.json`. Wrenchwise changed materials, uniformly normalized scale, grouped meshes, and removed the GS spoiler. These modifications are also supplied under CC BY 4.0. This license notice must accompany redistribution of the asset, including the combined GS assembly.

A source listing's license is the creator's stated license; it is not a factory CAD provenance certificate. Geometry and fitment remain unverified. The raw download is reproducible with `modeling/catalog/fetch_sources.py`. Preparation uses `modeling/catalog/prepare_downloaded.py` in Blender 4.5.

OEM press photos were reviewed locally. Only their source URLs, hashes, and review notes are committed. They are not copied into the public website or repository, and are not offered as open-licensed textures.

## Toyota GR Supra visual reference

[Toyota GR Supra](https://sketchfab.com/3d-models/86f609515557438e93bd3c6145ef99ca) by [3dmodels.cars](https://sketchfab.com/3dcarsmodels), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Acquired from its public Objaverse mirror; immutable source hash and URL are in `research/asset-licenses.json`. Adaptations: uniform length normalization, PBR material restoration, stable component IDs and Meshopt web compression. The model has no original bitmap textures in this distribution. Exact market/year, engine, transmission, underbody and physical accuracy are unverified. The derivative GLB and Blender output retain CC BY 4.0; application MIT licensing does not replace asset licensing.

## Lexus ES XV70 visual reference

[2021 Lexus ES350 F Sport](https://sketchfab.com/3d-models/ec3a23f5653d44a68b4b2d5d6c3a582b) by [David_Holiday](https://sketchfab.com/David_Holiday), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Public Objaverse source, hash and adaptations are recorded in `research/asset-licenses.json`. Uniform length normalization, material/shading changes, empty mesh removal, stable IDs and compression do not establish physical accuracy. No engine/transmission model or usable underbody anatomy is present. Derivative assets remain CC BY 4.0.

## Rejected stock-IS development study

`modeling/lexus-classes/development/` contains an adapted [Draft request: Toyota Altezza 2001](https://sketchfab.com/3d-models/0396aafda6294dc4843250d979783656) by [BaizilikoVIIChai](https://sketchfab.com/BaizilikoVIIChai), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Original SHA256: `dbde431554c4ef1f1236a894bb0dbb761501283c41cdeb448dd4a22f38e1368e`. Public mirror: `https://huggingface.co/datasets/allenai/objaverse/resolve/main/glbs/000-153/0396aafda6294dc4843250d979783656.glb`. Adaptations: orientation, uniform 4.4 m length, material restoration, IDs and compression. The derivative remains CC BY 4.0. It is not a stock Lexus IS: wheels/trim are modified, lamp surfaces lack detail and the cabin is missing. It is excluded from the public vehicle selector. Retained to document review and support later reconstruction; no creator endorsement implied.
