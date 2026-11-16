# Neulemuistio

Yksinkertainen muistio neuletöille. Toimii selaimessa ja puhelimessa, myös ilman nettiä.
Tiedot ja kuvat tallentuvat **vain omalle laitteelle** (selaimen IndexedDB). Tunnuksia tai palvelinta ei tarvita.

## Ominaisuudet

- **Työt omilla nimillään**, tila (suunnitteilla / kesken / tauolla / valmis) ja päivämäärät
- **Kuvat työstä** – ensimmäinen kuva on kansikuva, isot kuvat pienennetään automaattisesti
- **Ohje** – nimi, suunnittelija, linkki sekä ohjeen kuvat ja PDF:t
- **Langat** – merkki, laatu, väri, värjäyserä, materiaali, m/kerä ja g/kerä
- **Lankavarasto** – omat langat (merkki, laatu, väri, erä, paksuus, materiaali, m/kerä, g/kerä, kerien määrä).
  Näet kokonaismäärät sekä mitkä työt ovat varanneet langan ja paljonko on vapaana.
- **Langat töissä** – valitse lanka varastosta tai syötä käsin; käsin syötetyn langan voi linkittää
  varastoon tai lisätä sinne yhdellä napilla
- **Lankalaskuri** – ohjeen tarve metreinä, grammoina tai kerinä → montako kerää tarvitaan ja riittääkö
  varaston lanka, kun muiden keskeneräisten töiden varaukset huomioidaan
- **Omat välineet** – oma sivu neulepuikoille, sukkapuikoille, pyöröpuikoille ja virkkuukoukuille
  (koko, pituus, materiaali). Näet, missä töissä kukin on käytössä ja mitkä ovat vapaana.
- **Välineet töissä** – valitse omista tai merkitse ohjeen vaatima koko: sovellus kertoo omistatko sen,
  onko se jo käytössä toisessa keskeneräisessä työssä, ja puuttuvan voi lisätä omiin yhdellä napilla.
  Lisäksi silmukkamerkit ja muut välineet.
- **Muistiinpanot** – päivätyt merkinnät nopeasti (Ctrl + Enter)
- Haku ja suodatus tilan mukaan
- **Varmuuskopio** – vienti ja tuonti JSON-tiedostona (sisältää kuvat)

## Käyttö

Sovellus on pelkkiä staattisia tiedostoja, eikä se tarvitse käännösvaihetta.

Paikallisesti:

```sh
cd public && python3 -m http.server 8000
# avaa http://localhost:8000
```

Julkaisu: sovellus on julkaistu Cloudflare Workersissa osoitteessa **https://neule.promptly.fi**.
Cloudflare julkaisee `public/`-kansion automaattisesti jokaisesta GitHubiin tulevasta muutoksesta
(asetukset `wrangler.jsonc`:ssä).

Puhelimeen: avaa osoite puhelimen selaimessa ja valitse *Lisää kotivalikkoon / Asenna sovellus*.
Sen jälkeen sovellus toimii myös offline.

> Huom. tiedot ovat laitekohtaisia. Siirrä ne toiselle laitteelle varmuuskopion avulla.

## Tiedostot

| Tiedosto | Sisältö |
|---|---|
| `public/index.html` | Sivun runko |
| `public/app.js` | Näkymät, tallennus, lankalaskuri, varmuuskopiot |
| `public/db.js` | IndexedDB-tallennus |
| `public/style.css` | Ulkoasu (vaalea ja tumma teema) |
| `public/sw.js`, `public/manifest.webmanifest` | Offline-tuki ja asennettavuus |
| `wrangler.jsonc` | Cloudflare-julkaisun asetukset |

## Android-sovellus

`android/` sisältää Android-sovelluksen (Trusted Web Activity), joka avaa osoitteen
https://neule.promptly.fi koko näytön sovelluksena. Tiedot ovat samat kuin Chromessa samassa osoitteessa.

- Paketti: `fi.promptly.neule`
- Sovelluksen allekirjoituksen tunniste on `public/.well-known/assetlinks.json`:ssa. Ilman sitä sovellus näyttää osoiterivin.
- Allekirjoitusavain (`android-avain/`) **ei ole versionhallinnassa**. Säilytä se turvassa: päivitykset
  pitää allekirjoittaa samalla avaimella.

Rakentaminen (Android SDK ja JDK 17+):

```sh
cd android
echo "sdk.dir=/polku/android-sdk" > local.properties
gradle assembleRelease   # → app/build/outputs/apk/release/app-release.apk
```
