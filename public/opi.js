// Opi neulomaan: aloittelijan oppitunnit järjestyksessä.
// Edistyminen tallennetaan tälle laitteelle (localStorage).

const KEY = 'neulemuistio-opi';

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* yksityinen ikkuna tms. – edistyminen ei vain tallennu */ }
}

const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

// Oikea silmukka näyttää V:ltä, nurja silmukka poikittaiselta nypyltä.
const STITCH_SVG = `
<svg class="opi-svg" viewBox="0 0 320 120" role="img" aria-label="Oikea silmukka näyttää V-kirjaimelta, nurja silmukka poikittaiselta nypyltä">
  <g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round">
    <path d="M30 30 L50 80 L70 30" /><path d="M75 30 L95 80 L115 30" />
    <path d="M200 50 q20 -18 40 0" /><path d="M245 50 q20 -18 40 0" />
    <path d="M200 80 q20 -18 40 0" /><path d="M245 80 q20 -18 40 0" />
  </g>
  <text x="72" y="112" text-anchor="middle">oikea = V</text>
  <text x="242" y="112" text-anchor="middle">nurja = nyppy</text>
</svg>`;

export const LESSONS = [
  {
    id: 'tarvikkeet',
    title: 'Hanki oikeat aloitustarvikkeet',
    time: '5 min',
    body: `
      <p>Oikeat välineet tekevät ensimmäisistä kerroista paljon helpompia.</p>
      <ul>
        <li><strong>Lanka:</strong> vaalea, sileä ja ei-pörröinen villa- tai villasekoitelanka, jonka vyötteessä
          suositellaan puikkoja <strong>4,5–5 mm</strong> (”aran” tai ”worsted”). Vaaleasta langasta näet silmukat.</li>
        <li><strong>Puikot:</strong> suorat puikot 4,5–5 mm, mieluiten <strong>bambua tai puuta</strong> –
          silmukat eivät liu'u niiltä yhtä helposti kuin metallipuikoilta.</li>
        <li>Sakset ja <strong>parsinneula</strong> (tylppä neula langanpäille).</li>
      </ul>
      <p class="opi-tip">Vältä aluksi mustaa, mohair- ja nauhalankaa sekä hyvin ohutta lankaa: niistä on vaikea nähdä,
        mitä puikoilla tapahtuu.</p>`,
    video: 'kuinka aloittaa neulominen aloittelija',
  },
  {
    id: 'luonti',
    title: 'Luo silmukat',
    time: '15–30 min',
    body: `
      <p>Ensin puikolle tehdään aloitussilmukat. Yleisin tapa on <strong>luonti peukalon ja etusormen avulla</strong>
        (englanniksi <em>long-tail cast on</em>).</p>
      <ol>
        <li>Jätä langasta pitkä häntä: noin <strong>3 cm jokaista silmukkaa kohden</strong>
          (20 silmukkaa → n. 60 cm).</li>
        <li>Tee hännän päähän <strong>liukusolmu</strong> ja pujota se puikolle. Se on ensimmäinen silmukka.</li>
        <li>Pidä häntä peukalon ja kerälanka etusormen ympärillä, molemmat langat kämmenessä.</li>
        <li>Vie puikko peukalon lenkin alta ylös, hae etusormen lanka ja vedä se peukalolenkin läpi.</li>
        <li>Päästä peukalo irti ja kiristä silmukka kevyesti puikolle. Toista.</li>
      </ol>
      <p class="opi-tip">Älä kiristä liikaa – silmukan pitää liukua puikolla vapaasti.
        Vinkki: luo silmukat kahden päällekkäin pidetyn puikon ympärille ja vedä toinen pois, niin reunasta tulee joustava.</p>`,
    video: 'silmukoiden luominen peukalo etusormi',
  },
  {
    id: 'oikea',
    title: 'Neulo oikea silmukka',
    time: '30 min',
    body: `
      <p>Oikea silmukka on neulomisen perusta. Lanka on <strong>työn takana</strong>.</p>
      <ol>
        <li><strong>Pistä:</strong> työnnä oikea puikko vasemman puikon ensimmäiseen silmukkaan edestä taakse,
          vasemmalta oikealle.</li>
        <li><strong>Kierrä:</strong> kierrä lanka oikean puikon kärjen ympäri vastapäivään.</li>
        <li><strong>Vedä:</strong> vedä uusi lenkki silmukan läpi oikealle puikolle.</li>
        <li><strong>Pudota:</strong> liu'uta vanha silmukka pois vasemmalta puikolta.</li>
      </ol>
      <p>Muistisääntö: <strong>pistä – kierrä – vedä – pudota</strong>. Kun kaikki silmukat ovat oikealla puikolla,
        käännä työ ja vaihda puikot käsissä.</p>
      <p class="opi-tip">Hidas ja tasainen on parempi kuin nopea. Rytmi löytyy itsestään parin illan aikana.</p>`,
    video: 'oikea silmukka neulominen aloittelijalle',
  },
  {
    id: 'tilkku',
    title: 'Harjoitustilkku ainaoikeinneuleena',
    time: '1–2 iltaa',
    body: `
      <p>Kun kaikki kerrokset neulotaan oikein, syntyy <strong>ainaoikeinneule</strong>: joustava, ei rullaa ja
        näyttää samalta molemmin puolin.</p>
      <ol>
        <li>Luo <strong>20 silmukkaa</strong>.</li>
        <li>Neulo kaikki kerrokset oikein, kunnes tilkku on noin 10 × 10 cm.</li>
        <li><strong>Laske silmukat jokaisen kerroksen lopussa.</strong> Jos määrä muuttuu, katso
          ”Virheiden korjaaminen”.</li>
      </ol>
      <p class="opi-tip">Tilkkua ei tarvitse säilyttää – se on harjoitus. Voit lisätä sen Neulemuistioon
        ensimmäiseksi työksesi alla olevalla napilla ja kirjata ylös, mitä opit.</p>`,
    practice: true,
    video: 'ainaoikein neule aloittelija',
  },
  {
    id: 'nurja',
    title: 'Neulo nurja silmukka',
    time: '30 min',
    body: `
      <p>Nurja silmukka on oikean silmukan peilikuva. Lanka on <strong>työn edessä</strong>.</p>
      <ol>
        <li>Pistä oikea puikko silmukkaan <strong>takaa eteen, oikealta vasemmalle</strong>
          (puikko jää vasemman puikon eteen).</li>
        <li>Kierrä lanka oikean puikon ympäri vastapäivään.</li>
        <li>Vedä lenkki taaksepäin silmukan läpi.</li>
        <li>Pudota vanha silmukka pois.</li>
      </ol>
      ${STITCH_SVG}
      <p>Opettele tunnistamaan silmukat: <strong>oikea silmukka näyttää V-kirjaimelta</strong>,
        <strong>nurja poikittaiselta nypyltä</strong>.</p>`,
    video: 'nurja silmukka neulominen',
  },
  {
    id: 'sileä',
    title: 'Sileä neule ja joustinneule',
    time: '1–2 iltaa',
    body: `
      <p><strong>Sileä neule</strong> (esim. villapaitojen pinta): oikealla puolella kaikki silmukat oikein,
        nurjalla puolella kaikki nurin. Reunat rullautuvat – se on normaalia.</p>
      <p><strong>Joustinneule</strong> (resorit, pipon reuna): vuorotellen oikeita ja nurjia, esim.
        <strong>2 o, 2 n</strong>. Seuraavalla kerroksella neulotaan silmukat ”niin kuin ne näyttävät”:
        V:t oikein ja nypyt nurin.</p>
      <p class="opi-tip">Joustimessa lanka siirretään oikean ja nurjan välissä <strong>puikkojen välistä</strong>
        eteen tai taakse – ei puikon yli. Muuten syntyy vahingossa ylimääräinen silmukka.</p>`,
    video: 'joustinneule 2 oikein 2 nurin',
  },
  {
    id: 'paattely',
    title: 'Päättele silmukat ja langanpäät',
    time: '20 min',
    body: `
      <ol>
        <li>Neulo 2 silmukkaa.</li>
        <li>Nosta vasemman puikon kärjellä oikean puikon <strong>ensimmäinen silmukka toisen yli</strong> ja pois puikolta.</li>
        <li>Neulo yksi silmukka lisää ja toista, kunnes jäljellä on yksi silmukka.</li>
        <li>Katkaise lanka (jätä 15 cm) ja vedä se viimeisen silmukan läpi.</li>
        <li>Pujottele langanpäät parsinneulalla työn nurjalle puolelle muutaman sentin matkalta ja leikkaa.</li>
      </ol>
      <p class="opi-tip">Päättele <strong>löysästi</strong> – kireä päättelyreuna ei veny. Tarvittaessa käytä
        oikeassa kädessä numeroa isompaa puikkoa.</p>`,
    video: 'silmukoiden päättely neulominen',
  },
  {
    id: 'virheet',
    title: 'Virheiden korjaaminen',
    time: 'tarpeen mukaan',
    body: `
      <p>Kaikki tekevät virheitä – korjaamisen oppiminen on yhtä tärkeää kuin neulominen.</p>
      <ul>
        <li><strong>Pudonnut silmukka:</strong> nosta se virkkuukoukulla takaisin ylös kerros kerrallaan
          poikittaisia lankoja pitkin ja pujota puikolle.</li>
        <li><strong>Purkaminen silmukka kerrallaan:</strong> pistä vasen puikko alemman kerroksen silmukkaan ja
          vedä lanka ylempää pois. Toista, kunnes olet virheen kohdalla.</li>
        <li><strong>Silmukoita tuli lisää:</strong> usein lanka on kulkenut puikon yli kerroksen alussa, jolloin
          reunasilmukka näyttää kahdelta. Neulo ylimääräiset tarvittaessa kaksi yhteen.</li>
        <li><strong>Elämänlanka:</strong> pujota parsinneulalla eriväristä lankaa puikolla olevien silmukoiden läpi
          ennen vaikeaa kohtaa. Jos joudut purkamaan, purkaminen pysähtyy siihen.</li>
      </ul>`,
    video: 'pudonneen silmukan nostaminen virkkuukoukulla',
  },
  {
    id: 'ohjeet',
    title: 'Opi lukemaan neuleohjetta',
    time: '15 min',
    body: `
      <table class="opi-table">
        <tbody>
          <tr><th>o / n</th><td>oikea / nurja silmukka</td></tr>
          <tr><th>s</th><td>silmukka</td></tr>
          <tr><th>krs</th><td>kerros</td></tr>
          <tr><th>2 o yht</th><td>neulo 2 silmukkaa yhteen oikein (kavennus)</td></tr>
          <tr><th>lk</th><td>langankierto (lisäys, tekee reiän)</td></tr>
          <tr><th>*…*</th><td>toista tähtien välinen osa (mallikerta)</td></tr>
          <tr><th>OP / NP</th><td>työn oikea puoli / nurja puoli</td></tr>
        </tbody>
      </table>
      <p><strong>Neuletiheys</strong> kertoo, montako silmukkaa ja kerrosta mahtuu 10 cm:iin. Vaatteissa se kannattaa
        tarkistaa neulomalla koetilkku – muuten koko ei täsmää. Tiheyden voi tallentaa jokaiseen työhön Neulemuistiossa.</p>`,
    video: 'neuleohjeen lyhenteet',
  },
  {
    id: 'ensimmainen',
    title: 'Ensimmäinen oikea työ',
    time: 'viikko tai pari',
    body: `
      <p>Valitse ensimmäiseksi työksi jotain <strong>suorakaiteen muotoista</strong>, jossa koolla ei ole väliä:</p>
      <ol>
        <li><strong>Tiskirätti</strong> puuvillalangasta ainaoikeinneuleena – pieni, nopea ja hyödyllinen.</li>
        <li><strong>Kaulahuivi</strong> ainaoikeinneuleena tai joustinneuleena paksusta langasta.</li>
        <li><strong>Pipo pyöröpuikoilla</strong> – tutustut neulomiseen suljettuna ympyränä ja kavennuksiin.</li>
        <li>Sen jälkeen <strong>lapaset tai villasukat</strong> sukkapuikoilla.</li>
      </ol>
      <p class="opi-tip">Hae ohjeita hakusanoilla ”aloittelijalle” tai ”helppo”. Merkitse uusi työ Neulemuistioon,
        niin langat, puikot ja muistiinpanot pysyvät tallessa.</p>`,
    video: 'helppo neuleohje aloittelijalle',
  },
];

export const RESOURCES = [
  {
    title: 'Kansalaisopistojen ja Taito-yhdistysten neulekurssit',
    text: 'Paras tapa oppia nopeasti: opettaja näkee kädestä heti, mikä menee pieleen. Kursseja on lähes joka kunnassa, ja Taito-yhdistyksiltä saa myös neuvoja.',
    links: [['Opistopalvelut.fi', 'https://www.opistopalvelut.fi'], ['Taito.fi', 'https://www.taito.fi']],
  },
  {
    title: 'Lyhyet opetusvideot',
    text: 'Videolta näkee käden liikkeen, jota on vaikea selittää tekstillä. Katso jokaisen oppitunnin ”Katso video” -linkki. Englanninkielisiä hakusanoja: long-tail cast on, knit stitch, purl stitch.',
    links: [['Hae videoita', yt('neulominen aloittelijalle')], ['VeryPink Knits (englanniksi)', yt('VeryPink Knits beginner')]],
  },
  {
    title: 'Ilmaiset aloittelijan ohjeet',
    text: 'Suomalaisilla lankavalmistajilla ja -kaupoilla on paljon ilmaisia ohjeita. Ravelrysta voi suodattaa ohjeet vaikeustason ja langan mukaan.',
    links: [['Novita', 'https://www.novita.fi'], ['Ravelry', 'https://www.ravelry.com']],
  },
  {
    title: 'Neulekahvilat ja kaverit',
    text: 'Lankakauppojen ja kirjastojen neuleillat ovat ilmaisia ja tervetulleita aloittelijoille. Joku osaa aina auttaa pudonneen silmukan kanssa.',
    links: [],
  },
];

export const videoUrl = yt;
