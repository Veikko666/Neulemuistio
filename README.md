# Neulemuistio

Yksinkertainen muistio neuletöille. Toimii selaimessa ja puhelimessa, myös ilman nettiä.
Tiedot ja kuvat tallentuvat **vain omalle laitteelle** (selaimen IndexedDB). Tunnuksia tai palvelinta ei tarvita.

## Ominaisuudet

- **Työt omilla nimillään**, tila (suunnitteilla / kesken / tauolla / valmis) ja päivämäärät
- **Kuvat työstä** – ensimmäinen kuva on kansikuva, isot kuvat pienennetään automaattisesti
- **Ohje** – nimi, suunnittelija, linkki sekä ohjeen kuvat ja PDF:t
- **Langat** – merkki, laatu, väri, värjäyserä, materiaali, m/kerä ja g/kerä
- **Lankalaskuri** – ohjeen tarve metreinä, grammoina tai kerinä → montako kerää tarvitaan ja riittävätkö omat
- **Puikot, koukut ja merkit** – koko ja lisätieto (esim. pyöröpuikon pituus)
- **Muistiinpanot** – päivätyt merkinnät nopeasti (Ctrl + Enter)
- Haku ja suodatus tilan mukaan
- **Varmuuskopio** – vienti ja tuonti JSON-tiedostona (sisältää kuvat)

## Käyttö

Sovellus on pelkkiä staattisia tiedostoja, eikä se tarvitse käännösvaihetta.

Paikallisesti:

```sh
python3 -m http.server 8000
# avaa http://localhost:8000
```

Puhelimeen: julkaise esim. **GitHub Pagesissa** (Settings → Pages → branch), avaa osoite puhelimen
selaimessa ja valitse *Lisää kotivalikkoon / Asenna sovellus*. Sen jälkeen sovellus toimii myös offline.

> Huom. tiedot ovat laitekohtaisia. Siirrä ne toiselle laitteelle varmuuskopion avulla.

## Tiedostot

| Tiedosto | Sisältö |
|---|---|
| `index.html` | Sivun runko |
| `app.js` | Näkymät, tallennus, lankalaskuri, varmuuskopiot |
| `db.js` | IndexedDB-tallennus |
| `style.css` | Ulkoasu (vaalea ja tumma teema) |
| `sw.js`, `manifest.webmanifest` | Offline-tuki ja asennettavuus |
