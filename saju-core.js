/**
 * saju-core.js — 외부 의존성 0. 한국 기준 사주팔자 계산기.
 *
 * [데이터] 1899~2101년 12절(월 경계) 시각표. UTC 분 단위, 델타 base64 인코딩 (4.9KB).
 *   출처: lunar-javascript(寿星 만세력 계열) 값을 astronomy-engine으로 교차검증.
 *   검증: 1900~2100년 4,824건 평균오차 12.6초 / 2024년 한국 공개 절기표 24개 분 단위 전량 일치.
 *
 * [설계]
 *   1) 벽시계 시각 + IANA 시간대 → UTC 절대시각
 *      (서머타임 1948~51·1955~60·1987~88, UTC+8:30 시기 1954~61 자동 처리)
 *   2) 년주·월주: UTC 절대시각을 절기 절대시각과 비교
 *   3) 일주·시주: 동경 135도 기준(UTC+9)으로 판정. 경도 보정은 선택
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SajuCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
  var ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var GAN_KO = '갑을병정무기경신임계'.split('');
  var ZHI_KO = '자축인묘진사오미신유술해'.split('');
  // 천간 오행 / 음양
  var GAN_WX = ['목','목','화','화','토','토','금','금','수','수'];
  var GAN_YY = ['양','음','양','음','양','음','양','음','양','음'];
  var ZHI_WX = ['수','토','목','목','토','화','화','토','금','금','토','수'];
  var ZHI_YY = ['양','음','양','음','양','음','음','양','양','음','양','음'];
  // 지지 지장간 (본기 위주 간략)
  var ZHI_HIDDEN = [['계'],['기','계','신'],['갑','병','무'],['을'],['무','을','계'],['병','경','무'],
                    ['정','기'],['기','정','을'],['경','임','무'],['신'],['무','신','정'],['임','갑']];

  // ── 절기 테이블 ──────────────────────────────────────────────
  var C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var EPOCH_MS = -2208988800000;      // 1900-01-01T00:00:00Z
  var FIRST_SEC = -31146153;     // 첫 절(1899 소한)의 EPOCH 기준 초
  var BASE = 2545053;           // 델타 최소값 오프셋
  var DATA = 'AwsGpWQThbTmksFpxEpBhiq8YlTNneEsLABvAu5GogQTsbUaktipzUpDtisfYmCNm-EqpAAAAt4GpIQWLbXukvupzOpB7iqsYlwNoUEsjABTAuAGnlQS1bTVkq-pu7o_giqsYoINsnExWAE1Au5Gl6QQIbRkkrspxspClis6YouNruEwHAD6AucGl3QQTbRyksTpy2pDdisiYnDNpnEupAD9Av-Gn-QR3bRrkpkpu1pAdirUYnRNqVEvQAEzAxmGqPQUBbTMkqcpuxo_1irJYoENsEEwqAELAuvGmjQQxbQ7kpcpuppATisfYp7NtiExQAD4AthGkwQPXbQtkqupxMpCFisBYn-NrREvzADzAupGmjQRpbTYks9pyMpB6iqqYmENqGEv9AFPAwoGnXQPkbOsknPptNo_pirhYoSNsVExlAGCAwnGm1QO5bOFknxpvapC1ivGYq3NsHEu1ACOAtdGlzQQXbQ7kqdpxcpDviuwYqSNr_EuiABYAsPGkvQQAbQ7ko4pt7pAaitAYqfNt9ExaAEBAt0Gk7QPNbQYkp8pvnpBaitmYrgNwBEz_AFSAspGhdQKebL8knmpv9pDPivnYs2NwhE0KAF9AtmGh-QJ_bKfkmNpwNpEliwPYr_NuTEx9AFZAvYGlnQOVbOHknrpvapDNivdYr6NupEyIAFfAv9GmJQNkbLekjRpp5o-4iuVYt2NyOE1cAG-AvOGkhQMmbLvkk_psdpA-ivzYuqNx1E0MAFHAtGGjHQNLbOqkpMpwhpC9iulYrvNvlEzVAFfAt7GjcQM3bN7knXptopAWispYqMNuxEz2AHdAwsGlwQNebNNknopvhpDCivaYsNNvmEzZAFdAtsGisQK0bK-kmXpwMpFdiyrYvINwtEyQADPAriGhTQKabLDkmLpwMpF9izPYviNwxEx3ACiArGGhsQMAbNvkoqpwzpFWiy7YwMNyeEz_AELAriGgIQIPbIukjwpsipB_ixuYxvN2OE4kAH5As4GfBQFpbF1kiQptppEriz9YyXN1QE3HAG4AsqGfnQHAbHtkkHpvdpGWi0KYw5NzOE1lAGwAuFGh1QI3bH2khGppmpAiixAYwTNz8E2sAIDAv2Gj5QKUbIUkhqpqVpAxixfYx1N2HE4EAG9AsiGgLQH_bH4kitpsYpCpiyaYyTN2XE4DAGzAr0GeyQGvbHkkjGptDpC4ixLYvpNzlE2dAG9AtXGgzQIsbJ3kl5pvVpEcix_YvWNysE16AHVAuhGhWQHCbF8khQprrpCkiyhYxmN1JE3hAHvAtxGgMQF-bEokgQpsgpFbi2DY0LN1SE1KAD-AqSGepQHVbIdkklpv9pH3i3IY0ZN1oE1aADuApgGduQGtbH8kiwprupCwiz-Y0GN3oE4oAG3ArZGdrQEwbFZkiDptPpEji1SY1vN6CE7GAH0AqOGa0QBUbCtkhPpvFpIGi4NY2-N6BE69AIjArbGbdQAvbA5kelpsipGji3cY1oN3qE4sAH-AtRGfHQEubD6kgFpsbpF7i3nY2zN5CE5eAIPAtrGfhQEZbCHkcopoGpB7i1oY36N8YE8_AJ2AstGdVQCrbBWkcjpospC_i2ZY3sN7RE7iAIUArPGceQDfbEskhxptopF8i2cY1qN5HE6eAIrAsbGdgQDubD0kfkpqFpBsizDYznN4TE67AKbAu5GfgQD1bCEkeEpqxpECi1pY11N5hE6hAIEArkGciQCPbB8kfCptHpICi5vY4hN6ME5YAGFApeGa8QBibCAke5prwpF8i4VY3oN5bE4sAFmApYGbeQCrbDpkg6ptRpGci40Y5IN7vE7FAHSApuGZzP_Qa_hkdOpq8pFFi4HY6LN-3E_IAKdAqrGYdP8Za8IkaYpqCpGqi6PY6YN9IE9BAJSAqwGZjP-Da-WkdMps3pJOi8IY62N8IE7aAIYAraGbkQAVa_Bka1pntpDAi3zY55N9bE9VAKFAs3GcyQAxa-XkZypnQpDNi4aY7iN__E_GAJOApbGYkP-Ga-lkcaprGpHNi7LY8ZN_wE-0AJWApVGXzP9Fa-Mkcwpq3pFYi4XY5MN88E9fAKGArvGalP-9a-4kdQpsBpG9i5rY5-N8-E9OAKLAsWGawP90a8UkaIpp9pG0i7GY8WN_gE-5AKeArbGZkP82a7PkYkpoopHPi9JY91N_CE8kAHKAodGYMP9ya-Xkc8psopJ8i-1Y_IOAFE9CAG3AnpGXgP9za-gkbvppWpE7i6YY9rOB2FAyAKxAqDGXcP7Qa61kY-poppFui7HY-cODgFCsALeApBGU4P4Na5BkZoprypKmi_lZALOCoFBUALbAqOGWbP5Aa4ckX9ppLpHFi8oY9_OATE_IAKpArsGZrP8ga6ckX1poHpGVi8lY_IOCAFAHAKjArDGYwP7na5okWipmVpFIi8cZAdOE7FDZAMNAqJGWbP5ba4gkWPpmApEvi8OY_UOCvFBIAKdAo8GVxP5va6hkaZprLpIhi9gY-2OBhFAFAKUApvGXBP60a6jkY5po1pFui6yY9OOBTFBBAMAArmGYAP54a32kV1pnNpGqi9GY_eOCuFArAJmAoGGUyP3_a37kX-pq7pL0jC7ZD5OEeFAMAIDAmSGTaP3ha4HkYEppppIji_wZCSOEFFAaAIgAmwGT7P4Aa4RkXuppSpIai_vZDaOGqFDoALPAn9GSoP01a03kVOpoSpI_jA9ZFCOJaFHSAOYApZGSOPyyax4kSdpmWpIcjBbZESOGzFEYAM0ApxGUJP1Qa0AkUUpocpKWjCyZFSOGyFDRALyAqBGWHP4Sa2LkTkpk6pFhi-qZDyOIEFFvAN6ArUGWlP34a1LkSMpjDpD-i9_ZEBOJOFGrANHAogGS7P1Oa1MkVcpoRpJLjB3ZFsOI4FFwAMsAoWGSoP1Ia1tkWnpo_pHli-MZBeOFWFD5AM-AqYGVLP2ua1skVTpoEpIQi_PZB-OFUFDpAM7AqgGUlP1CazZkTdpnlpKBjC5ZF1OIIFEyAMQAovGTFP0KaynkSepmepJTjDVZGYOHXFCbAJCAl0GRmP0oa0okVHppQpLijEwZIAOJEFDaAI5AktGQVP0Na08kU3pnipIojBwZG3OK7FHfANQAnfGQNPxKawwkReplZpH2jCAZHbOL_FIqANnAmjGN4Pt6at6kRGpogpNNjHhZKoOL7FHLAM5AnKGPiPvzavCkQ5pm8pKMjEHZIOOKcFGQANCAo9GSmPy1awUkPJpjXpHejC8ZIpOMIFIAAN0AohGRBPw1au5kOvpjVpIDjEvZLYOPYFLDAPYAoEGPqPvuaumkPPpj1pHTjDBZI9OMmFItAOCAnlGPqPwPav3kRWpm3pKAjDzZIYOLgFHxAN2AoZGRGPxyawzkRNpl0pI3jCwZHiOLeFIzAPtAqcGSZPxRauskOqpjppH_jDoZJJOMaFH4AMzAmpGPEPvVauYkQMpnbpNXjJVZNhOOKFHTAK7AkeGNsPvpawUkSYpoEpLkjGTZLUONqFICAMHAlcGOFPvcavhkQ0pl3pJyjFSZLYOPLFKpAOwAmmGMaPrRaq4kOHpmCpMIjIoZOpOSJFNbAQ5AntGMqPqiapKkMKpk7pL2jIcZNROPNFKDAOuAnhGOLPsxaq3kMbpkdpLyjIuZN6OPiFJdANxAnYGPePvNas_kMwpiWpImjGhZNtORaFMUAQAAoWGPTPuHarokLjpgwpGOjEjZNLOSCFMsAO8AlkGLnPrMaqrkNNpk_pLajIfZPGOSJFMRAO3AlnGLgPrQarwkPJpmdpLHjGCZLaOO-FKzAPdAn2GODPsmarMkNBpj1pJqjGCZLpOO3FKqAPrAoGGNXPqean_kKfpjnpMDjKpZRBOS7FMRAO0Al9GL2PqTaokkKzpjzpMOjKpZQrOSDFKfAMYAjpGKjPqraqRkMVpkMpMEjKZZRJOTXFMDANZAjvGJ6Pp7apykMRpjkpKfjI_ZRGOVfFQBAR0Am7GKqPn7amfkJlpiOpJnjIJZQfOVUFP8ARhAmOGJSPl7akVkIapjzpOBjNDZTXOVJFOPAQSAmYGKyPoVam_kKYpj8pMhjK3ZRVOTpFNOAQFAnmGNZPrLaoikJYpgopItjIdZQ5OUuFOyAQ-Am8GLHPoLalxkH7phDpKhjLUZUgOYRFRYARuAl2GJcPnSamckJxpjQpL4jKlZR2OVHFO3AQZAlnGJtPnxanRkKwpj-pMXjKfZQ9OTtFNpAQBAmOGKyPoXamqkJxpjRpMCjLAZSGOU_FO9ARZAnkGLwPoXalmkIGph_pLijLZZTgOWRFOVAOiAjeGHwPlpakbkH9pjSpPDjP4ZXBOX3FORANLAhcGGAPlQamNkLKplFpOSjOCZVlOXyFPqAPXAjdGHRPlYalHkJKpimpLQjLVZUiOYzFSOASNAkuGFdPgwafKkEbphfpNujPRZYVOb5FUhATuAlpGGIPhFafJkEKphnpOvjP5ZXGOZEFRTARuAlsGH9PjnahHkEYpfkpL8jOPZW4OZKFQ-ARDAloGJFPlRah4kD6pd-pJfjMpZXfObuFUUATsAm1GJHPk_ah_kEMpeHpItjK8ZWUObrFUOASpAkXGFuPiJahAkFHpgmpMajN5ZW5OacFS9ASNAklGGBPieaiVkIHpjdpNgjNOZUwOX4FRYASdAmvGJFPkyailkGnphspMEjMdZUpOXxFRBASBAl1GHNPh6aewkC3pgWpOajRdZaeOcSFSwAQ3AjRGFPPhkagLkFBpiYpQgjTGZazObkFRMAOtAhHGD3PhkahjkGipiKpOZjRKZahOcrFS6AQKAhsGDZPgGafFkEPpg1pNcjQnZbiOfvFXaAUqAkqGD1PeSacikCOpgVpODjQ3ZbHOfMFWwAUBAj7GCvPcwaa0kAspfwpPpjT8ZdDOe1FVXATLAkcGEdPe1acukCUpf8pN-jR-Zb7OeYFVFATNAlhGG9PiCae4kCGpd0pKtjOrZaTOe6FW0AUlAk-GERPeaabbj_VpchpLijQ9ZdJOhwFY-AVUAkSGCzPdPacCkCDpgDpOfjR4ZbNOeUFV2ATsAkUGD7PesadZkDUpgjpNcjQGZZhOclFUgATQAlAGFMPfJabmkAGpeOpM3jQ4ZbXOezFWVAUbAlqGFcPfOab3kANpeipOHjSkZc9OfrFVSARaAhoGBvPdBabgkA3pfJpPajVIZfPOgqFVPAQhAgGGAJPcFacCkDLphOpPMjTuZeiOhMFW0ASiAh-GBfPczab4kCNpgapOKjRvZdDOhrFZKAVdAjMF_mPYCaVyj8opdlpPijVqZguOkEFaeAWEAjtGAIPYPaV6j9XpfEpRujX1ZhGOiGFXQATiAjWGCNPbxaZDj-vpeBpOnjU9ZgROihFXiATEAiyGCRPcDaYKj8Npa0pL1jTcZhEOlmFbhAWPAj9GBrPbKaYoj92pcqpNQjT9ZhFOltFbaAVbAiHF-3PYdaXZj-jpePpO6jVMZgwOj_FZ5AU-AikF_ePYmaXaj_jpf7pPvjUpZfXOieFZEAVpAk6GC6PbzaY7j_Ape9pPXjUYZfJOigFZKAVcAjtGAbPYYaU6j61pb9pPqjYHZkCOmPFaeAURAhdF-lPXqaVtj9FpezpSIjZ5Zk1Ol5FZLASbAfzF9-PYqaX7j_QpfcpQKjW1ZjPOmZFa6AUPAguF9hPWjaUNj63pbzpOEjV1ZjfOopFe6AYtAkBF-WPVIaSUj6ApcapQLjYQZkkOn9FdJAXAAi5F9yPUxaR3j5lpcMpQVjZSZlWOnKFbPAVSAieF-2PWmaTTj6ApbZpOcjXDZkROndFb8AV4AjYGAuPZfaWKj7TpbKpNYjVaZjBOn0FdqAXOAifF9ZPVFaSTj4rpZepNJjXFZlbOp5FfAAXoAiHF8VPTqaRvj6fpdcpRBjY6ZktOnSFb6AViAhxF9kPV-aUVj8rpe8pRGjXlZjEOl3Fa9AVSAiSF-cPVzaR0j4JpaapO-jYLZlROorFdcAW2AisF9xPUtaRTj4jpbspRZjbrZomOqTFcdATuAeqF6bPTQaR6j6YpdYpSPjccZpqOrVFdVAT8AeDF5MPSDaRPj6Npc6pQrjaFZoVOsHFfxAXCAgzF67PSpaRGj54pdNpRajaBZnhOsOFhvAZ7AibF54PO1aLvj01pZ2pQ7jcbZqgOt3FiDAZ5AjCF68PPcaLYj0XpalpSpjd7Zq8OsfFfIAXFAiOF8_PT4aQcj3ppa9pQljbHZpLOsVFfoAXSAiFF9BPTtaPCj0fpWOpMGjYkZpBOucFjGAaWAjTF8JPSFaOlj2CpZJpOyjaaZp8OuIFhmAYRAhAF6APQ-aPMj4XpcapRRja5ZolOr9Ff2AXfAhEF6RPQxaOlj3mpbhpQljZ2ZnDOqfFfEAX2AixF8zPTEaPzj35pb9pR9jb7ZotOrTFfOAXPAg2F5zPPnaMPj0vpZ1pRsjelZtIOu-FgWAVvAeJF3PPN8aLpj1MpbfpT1jf7Zt4OvPFf6AUpAc5F2rPPAaOgj4fpdapTrjebZstOv2FiDAXFAeVF2TPMKaJmjy8pYQpP-jcyZswOxoFlnAbcAhzF3YPKuaG4jxEpYzpSgjgPZvjOyIFkBAZXAgfF3TPLvaISjyIpZrpTPjgnZvmOxoFi5AYEAf7F32PM_aJYjxmpWwpPYjdLZtoOxtFkVAZ3AhxF55PPQaLejzQpXrpPmjdNZtuOyhFmCAbPAhAF27PLbaIRjxjpXYpP1jeHZvROz5FmuAbUAg4F2TPKTaHPjxmpZTpSojfGZt4OxIFj3AZrAhHF4QPNVaKvj04pbopT2jfZZtJOv4Fi0AZSAhoF5UPNVaIYjwjpWnpQAjecZuoOyNFk0AacAhyF4lPMVaHhjwKpXkpSfjh7ZyUO0NFj3AXCAdXF1GPLgaJzj0DpbHpUujiwZyaO0hFkfAXLAcmFzfPJwaIpjzLpZDpRbjfQZwBO0cFmuAaqAf4F1YPJpaHIjyEpZ0pTUjg7Zw1O09Fn-AcRAgXF0CPGmaDBjuSpX9pT0jjOZzlO2gFn2AbjAgVF0jPG4aCYjsppWnpT1jjkZzYO1WFlkAZHAfSF13PKUaG_jwopYGpTEjiaZyyO1qFmfAZyAfdF13PJvaFIjtmpT3pOGjfBZydO39FqNAdLAg1F0oPHPaC7jsppVFpQmjhEZzmO3vFopAbBAeoFy3PG0aE1jwlpZupUqjiwZycO1nFnIAasAfYFz7PHOaEXjvKpW6pRajgMZweO0IFmkAbXAhRF2cPJCaEVjuUpXTpTPjjGZzfO2JFnI';
  var IDX = {};
  for (var _i = 0; _i < C.length; _i++) IDX[C[_i]] = _i;

  var _jie = null;
  function jieSeconds() {
    if (_jie) return _jie;
    var arr = [FIRST_SEC];
    for (var i = 0; i < DATA.length; i += 3) {
      arr.push(arr[arr.length - 1]
        + ((IDX[DATA[i]] << 12) | (IDX[DATA[i + 1]] << 6) | IDX[DATA[i + 2]]) + BASE);
    }
    _jie = arr;
    return arr;
  }
  // 테이블은 소한(丑월 시작)부터 시작. 절 i 의 월지 인덱스:
  //   소한=丑(1), 입춘=寅(2), 경칩=卯(3) ... 대설=子(0)
  function monthZhiOfJie(i) { return (i + 1) % 12; }

  /** UTC 절대시각(ms)이 속한 절의 인덱스. 이분 탐색. */
  function findJie(utcMs) {
    var arr = jieSeconds();
    var target = (utcMs - EPOCH_MS) / 1000;
    var lo = 0, hi = arr.length - 1;
    if (target < arr[0] || target >= arr[hi]) return -1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (arr[mid] <= target) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  // ── 시간대 ───────────────────────────────────────────────────
  var _fmtCache = {};
  function tzOffsetMinutes(y, mo, d, h, mi, tz) {
    var fmt = _fmtCache[tz];
    if (!fmt) {
      fmt = _fmtCache[tz] = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    var guess = Date.UTC(y, mo - 1, d, h, mi, 0), off = 0;
    for (var k = 0; k < 2; k++) {
      var d0 = new Date(guess - off * 60000);
      var parts = fmt.formatToParts(d0), p = {};
      for (var j = 0; j < parts.length; j++) p[parts[j].type] = parts[j].value;
      var asTz = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
      off = (asTz - d0.getTime()) / 60000;
    }
    return off;
  }

  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
      + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  function pillar(ganIdx, zhiIdx) {
    return {
      한자: GAN[ganIdx] + ZHI[zhiIdx],
      한글: GAN_KO[ganIdx] + ZHI_KO[zhiIdx],
      천간: { 한자: GAN[ganIdx], 한글: GAN_KO[ganIdx], 오행: GAN_WX[ganIdx], 음양: GAN_YY[ganIdx] },
      지지: { 한자: ZHI[zhiIdx], 한글: ZHI_KO[zhiIdx], 오행: ZHI_WX[zhiIdx], 음양: ZHI_YY[zhiIdx],
              지장간: ZHI_HIDDEN[zhiIdx] }
    };
  }

  /**
   * @param {object} birth {year, month, day, hour, minute}  출생 벽시계 시각
   * @param {object} opt
   *   tz         IANA 시간대. 기본 'Asia/Seoul'
   *   longitude  진태양시 경도 보정용 출생지 경도(도). null이면 보정 안 함 (서울≈126.98)
   *   nightZi    true = 23시부터 일주를 다음날로. 기본 true
   *   unknownHour true = 출생시각 모름. 시주를 null로 반환
   */
  function calc(birth, opt) {
    opt = opt || {};
    var tz = opt.tz || 'Asia/Seoul';
    var nightZi = opt.nightZi !== false;

    var offMin = tzOffsetMinutes(birth.year, birth.month, birth.day,
                                 birth.hour || 0, birth.minute || 0, tz);
    var utcMs = Date.UTC(birth.year, birth.month - 1, birth.day,
                         birth.hour || 0, birth.minute || 0, 0) - offMin * 60000;

    // 판정용 현지시각 (동경 135도 기준 + 선택적 경도 보정)
    var localMs = utcMs + 9 * 3600000;
    if (opt.longitude != null) localMs += (opt.longitude - 135) * 4 * 60000;
    var L = new Date(localMs);
    var ly = L.getUTCFullYear(), lmo = L.getUTCMonth() + 1, ld = L.getUTCDate();
    var lh = L.getUTCHours(), lmi = L.getUTCMinutes();

    // ── 일주 ──
    var dayBase = Date.UTC(ly, lmo - 1, ld);
    if (nightZi && lh >= 23) dayBase += 86400000;
    var D = new Date(dayBase);
    var dIdx = (jdn(D.getUTCFullYear(), D.getUTCMonth() + 1, D.getUTCDate()) + 49) % 60;
    var dayGan = dIdx % 10, dayZhi = dIdx % 12;

    // ── 시주 (오자둔) ──
    var 시주 = null;
    if (!opt.unknownHour) {
      var ziIdx = Math.floor(((lh + 1) % 24) / 2);
      시주 = pillar(((dayGan % 5) * 2 + ziIdx) % 10, ziIdx);
    }

    // ── 년주·월주 ──
    var ji = findJie(utcMs);
    if (ji < 0) throw new RangeError('지원 범위(1899~2101년) 밖입니다.');
    var monthZhi = monthZhiOfJie(ji);

    // 사주년: 직전 입춘(월지 寅=2)이 속한 해
    var k = ji;
    while (monthZhiOfJie(k) !== 2) k--;
    var springMs = EPOCH_MS + jieSeconds()[k] * 1000;
    var sajuYear = new Date(springMs + 9 * 3600000).getUTCFullYear();
    var yIdx = ((sajuYear - 4) % 60 + 60) % 60;
    var yearGan = yIdx % 10;

    // 월두법: 년간 → 寅월 천간 = (년간%5)*2+2
    var monthGan = ((yearGan % 5) * 2 + 2 + ((monthZhi - 2 + 12) % 12)) % 10;

    var 년주 = pillar(yearGan, yIdx % 12);
    var 월주 = pillar(monthGan, monthZhi);
    var 일주 = pillar(dayGan, dayZhi);

    // 오행 분포 (천간 4 + 지지 4, 시주 없으면 3+3)
    var tally = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    var list = [년주, 월주, 일주].concat(시주 ? [시주] : []);
    for (var i = 0; i < list.length; i++) {
      tally[list[i].천간.오행]++;
      tally[list[i].지지.오행]++;
    }

    // ── 경계 주의 플래그 ──────────────────────────────────────
    // 출생 시각이 아래 경계에 가까우면 시각 1~2분 오차로 기둥이 바뀐다.
    var 경고 = [];
    var arr = jieSeconds();
    var gapMin = Math.abs((utcMs - EPOCH_MS) / 60000 - arr[ji] / 60);
    var nextGap = ji + 1 < arr.length
      ? Math.abs(arr[ji + 1] / 60 - (utcMs - EPOCH_MS) / 60000) : Infinity;
    var near = Math.min(gapMin, nextGap);
    if (near <= 30) {
      경고.push({
        종류: '절기경계',
        분차: Math.round(near),
        설명: '절기 경계 ' + Math.round(near) + '분 이내입니다. 출생 시각이 조금만 달라도 월주(와 경우에 따라 년주)가 바뀝니다.'
      });
    }
    // 자시 경계 (23:00, 01:00)
    var minOfDay = lh * 60 + lmi;
    var ziGap = Math.min(Math.abs(minOfDay - 23 * 60), Math.abs(minOfDay - 60), minOfDay + 60);
    if (ziGap <= 15) {
      경고.push({
        종류: '자시경계', 분차: ziGap,
        설명: '자시 경계 ' + ziGap + '분 이내입니다. 야자시 유파에 따라 일주가 달라질 수 있습니다.'
      });
    }
    // 시지 경계 (매 홀수시 정각)
    var hourGap = Math.min((minOfDay + 60) % 120, 120 - ((minOfDay + 60) % 120));
    if (hourGap <= 10 && !opt.unknownHour) {
      경고.push({ 종류: '시지경계', 분차: hourGap,
        설명: '시지 경계 ' + hourGap + '분 이내입니다. 진태양시 보정 여부에 따라 시주가 바뀝니다.' });
    }
    // 시간대가 표준(UTC+9)이 아닌 시기
    if (offMin !== 540) {
      경고.push({ 종류: '표준시특이', 분차: offMin - 540,
        설명: '출생 당시 한국 표준시가 UTC+' + (offMin / 60) + '였습니다(서머타임 또는 UTC+8:30 시기). 벽시계 시각을 그대로 쓰면 틀립니다.' });
    }

    return {
      기준: {
        입력시간대: tz,
        적용오프셋분: offMin,
        판정시각: ly + '-' + pad(lmo) + '-' + pad(ld) + ' ' + pad(lh) + ':' + pad(lmi),
        경도보정: opt.longitude != null ? Math.round((opt.longitude - 135) * 4) + '분' : '없음',
        야자시: nightZi ? '23시부터 다음날' : '자정부터 다음날'
      },
      경고: 경고,
      사주: { 년주: 년주, 월주: 월주, 일주: 일주, 시주: 시주 },
      팔자: 년주.한자 + ' ' + 월주.한자 + ' ' + 일주.한자 + ' ' + (시주 ? 시주.한자 : '??'),
      일간: 일주.천간,
      오행분포: tally
    };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  return {
    calc: calc,
    tzOffsetMinutes: tzOffsetMinutes,
    지원범위: [1899, 2101],
    테이블크기: DATA.length
  };
}));
