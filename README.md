# Fitness Log

Türkçe, koyu temalı, sunucusuz antrenman günlüğü. Vanilla JavaScript; framework, CDN veya build adımı yok. Veriler bu tarayıcının IndexedDB alanında (`fitness-log`: `sessions`, `kv`) tutulur. İlk açılıştan ve çevrimdışı önbelleğin kurulmasından sonra internet gerekmez. Gerçek geçmiş dosyası uygulamaya gömülmemiştir.

## Yerelde çalıştırma

Bu klasörde:

```sh
npx serve .
```

Çıktıdaki localhost adresini aç. `file://` üzerinden açma; service worker HTTPS veya localhost ister. İlk açılış çevrimiçiyken yapılmalı. Sonrasında sayfayı yenileyerek çevrimdışı kullanabilirsin. Başlangıçta program boştur; Program ekranından hareket ekle veya JSON içe aktar.

Alt klasör testi için bir test sunucusunda bu klasörü `/fitness-log/` yoluna bağla veya temiz bir üst dizine `fitness-log/` adıyla kopyalayıp o üst dizinde `npx serve .` çalıştır. `/fitness-log/` adresini, sonundaki `/` ile aç. Tüm uygulama ve service worker yolları göreli olduğundan GitHub Pages proje yolunu destekler.

## GitHub Pages

1. GitHub'da örneğin `fitness-log` adlı bir depo oluştur.
2. `index.html`, `app.js`, `app.css`, `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/` ve bu README'yi depo köküne koy. `.codex-test/`, `design/`, brief ve kişisel JSON geçmişini yayınlama. `.codex-test/` Git tarafından yok sayılır ve test sırasında kişisel verinin kopyalarını içerebilir.
3. Deponun **Settings → Pages → Build and deployment → Deploy from a branch** bölümünü aç.
4. `main` ve `/ (root)` seçip kaydet. Verilen `https://kullanici.github.io/fitness-log/` adresini aç. HTTPS'nin etkin olduğunu kontrol et.
5. İndexDB verileri site adresine bağlıdır. Yerel test, başka alan adı veya Safari özel pencere verileri ayrı olabilir; taşıma için JSON yedeği kullan.

## iPhone'a kurulum

Safari'de yayın adresini aç → **Paylaş → Ana Ekrana Ekle → Ekle**. İlk açılışta önbelleğin kurulması için birkaç saniye bekle. Ana ekrandaki Fitness simgesinden aç. Program ve antrenmanlar cihazda saklanır; sunucuya veya başka bir servise gönderilmez. Uçak modunda tekrar açarak çevrimdışı kurulumu kontrol et.

## Eski uygulamadan taşıma ve yedekleme

Eski uygulamada **JSON dışa aktar** → dosyayı kaydet → yeni uygulamada **Program → JSON içe aktar**. Önizlemede seans sayısını kontrol et; programı da almak için **Programı da değiştir** kutusunu işaretle. Aynı `id` ile tekrar aktarım kopya oluşturmaz; kaydı günceller. v1 ve v2 kabul edilir. İlk aktarımda mevcut program boşsa Single Arm, Single Hand, Single Cable, Dumbbell/Dumbell adları TEK varsayılır; diğerleri TOPLAM. Sonraki v1 aktarımlarında eksik mod TOPLAM'dır. Açık v2 `load_mode` değerleri korunur. Her hareketin modunu Program ekranından düzenleyebilirsin; önceki seansların anlık ayarı değişmez.

İki haftada bir **Program → JSON dışa aktar → Dosyalar'a kaydet** önerilir. Destekleyen iPhone'da dosya paylaşım ekranı açılır (Dosyalar/AirDrop); diğer tarayıcılarda `fitness-log-YYYY-MM-DD.json` indirilir. Paylaşımı iptal edersen son yedek tarihi değişmez. İndirme yönteminde tarayıcıya dosya teslim edildikten sonra tarih güncellenir; tarayıcının indirmeyi tamamladığını ayrıca kontrol et. Tarayıcı verisini silmek, siteyi kaldırmak veya cihaz kaybı kayıtları kaybettirebilir; yedeğini cihaz dışında da tut.

Export şeması `fitness-log/v2`. `load_mode` (`single`/`total`) her harekette, isteğe bağlı `rating` (`energy`, `pump`, `sleep`: 1–5 veya null) seansta bulunur. Taslaklar export kapsamına girmez. TEK değerleri hacimde ikiyle çarpılmaz: hacim yazılan kg × tekrar toplamıdır. Tahmini tarihler `~` ile işaretlenir. Özet son 28 takvim gününü (bugün dahil) kapsar. Tahmini 1RM Epley formülünü ve 1–12 tekrar setlerini kullanır.

## Güncelleme

Değişiklikleri yayınlamadan önce `sw.js` içindeki `CACHE` adını artır (`fitness-log-v2` gibi). Yeni kabuk dosyalarını `SHELL` listesine ekle. Açık uygulama yeni service worker'ı algıladığında **Yeni sürüm hazır · Yenile** şeridi görünür. Yenile'ye dokununca yeni önbellek etkinleşir, eski sürüm önbellekleri silinir. IndexedDB kayıtları korunur. Taslaklar yaklaşık 500 ms sonra, uygulama arka plana geçerken de hemen kaydedilir; kapanma anı için yerel taslak kurtarma kopyası da vardır.

## Fontlar

Fontlar yereldir: Barlow 400/500/600, Barlow Condensed 500/600/700 ve JetBrains Mono 400; Latin ve Latin Extended alt kümeleriyle toplam 14 woff2 dosyası. Gövde Barlow, başlıklar ve büyük rakamlar Barlow Condensed 700, özet JetBrains Mono 400 kullanır. `@font-face` kuralları dosyaların unicode aralıklarını ve `font-display:swap` ayarını içerir; `system-ui` yedekleri korunur. Fontlar service worker kabuğunda önbelleğe alınır. Dış font isteği yoktur. OFL lisansları `fonts/OFL-*.txt` dosyalarındadır; dağıtımda fontlarla birlikte korunmalıdır.

## Doğrulama

Test araçları, ekran görüntüleri, tarayıcı profili ve sonuçlar yalnızca `.codex-test/` içindedir. Gerçek `../antrenman_gecmisi.json` uygulama dosyalarına eklenmeden dosya seçiciyle test edildi.

Tasarım düzeltmelerinde yedi ekran 375×812 boyutunda `design/*.dc.html` dosyalarından alınan referans görüntülerle karşılaştırıldı. Karşılaştırma görüntüleri `reference-*.png` ve `revision-*.png`, davranış kontrolleri `revision-results.json`, font/SW/grafik kontrolleri `platform-results.json` dosyalarındadır. Tüm görünür butonların en az 44×44 px, düzenlenebilir alanların en az 16 px yazı boyutunda olduğu ölçüldü. Küçük tasarım kontrollerinin dokunma alanları bu gereksinime göre genişletildi. Tarih seçici ve iOS paylaşımı için gerçek iPhone doğrulaması ayrıca yapılmalıdır.

| Kabul kontrolü | Sonuç |
| --- | --- |
| 1 — 59 seans, TEK/TOPLAM | Chrome'da gerçek v1 dosya seçimi, önizleme, 59 kayıt ve program modları doğrulandı. |
| 2 — Çevrimdışı | DevTools offline + önbelleği atlayan yenileme sonrası service worker uygulamayı açtı; set girişi ve kayıt çalıştı. |
| 3 — PWA / alt yol | `/fitness-log/` altında açılış, SW kontrolü ve manifest ayrıştırması doğrulandı. Normal Chrome penceresi bağlamında kurulabilirlik API'si hata vermedi. Lighthouse raporu ve gerçek iPhone kurulumu doğrulanmadı. |
| 4 — Taslak | Üç set onaylandı; sekme kapatılıp yeniden açılınca geri geldi. |
| 5 — Puan | Bitir → Enerji/Pump/Uyku → Kaydet; kayıt ve geçmiş detayında puanlar doğrulandı. |
| 6 — Özet | İki sekmede metin üretimi ve gerçek clipboard yazma/okuma doğrulandı. |
| 7 — v2 / geri aktarım | Dosya indirme olayı ve JSON blob içeriğinde v2/load_mode/rating doğrulandı; geri aktarım seans sayısını artırmadı. Test ortamı diske indirmeyi iptal etti; iOS paylaşım/Dosyalar işlemi doğrulanmadı. |
| 8 — Mobil görünüm | 375×812 ve 430×932'de tüm route'larda yatay taşma ölçülmedi. Safe area CSS kuralları mevcut; fiziksel çentik/home indicator testi yapılmadı. |
| 9 — Konsol | Kabul akışında JavaScript istisnası veya uygulama konsol hatası bulunmadı. JS sözdizimi kontrolleri geçti. |

Yerel önizleme için testte Python HTTP sunucusu kullanıldı. `serve` ve `lighthouse` paketleri yerel npm önbelleğinde bulunmadı (`npx --offline` kontrolü); ortamın ağ kısıtları nedeniyle bu komutlarla birebir test ve Lighthouse çalıştırılamadı. GitHub'a yayın yapılmadı; yukarıdaki adımlar yayın içindir.
