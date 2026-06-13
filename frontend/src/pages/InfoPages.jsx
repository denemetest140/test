import InfoPage from "../components/InfoPage";

export function About() {
  return (
    <InfoPage
      title="Hakkımızda"
      subtitle="Coinberx, Türkiye için tasarlanmış premium bir kripto borsasıdır."
    >
      <p>Coinberx, kullanıcılarımıza güvenli, hızlı ve şeffaf bir kripto al-sat deneyimi sunmak için kuruldu. Tüm arayüz, müşteri hizmetleri ve operasyonlarımız Türkçedir; yerel banka entegrasyonları ve düşük komisyon politikamızla rakiplerimizden ayrışırız.</p>
      <p>50'den fazla kripto varlık, anlık fiyat verisi, profesyonel grafikler ve dakikalar içinde tamamlanan IBAN yatırma akışı ile yatırımcılarımıza ihtiyaç duydukları her aracı sunuyoruz.</p>
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <div className="card-surface p-5"><div className="font-display text-2xl text-[#16A34A]">2024</div><div className="text-xs text-[#64748B] mt-1">Kuruluş yılı</div></div>
        <div className="card-surface p-5"><div className="font-display text-2xl text-[#16A34A]">İstanbul</div><div className="text-xs text-[#64748B] mt-1">Merkez</div></div>
        <div className="card-surface p-5"><div className="font-display text-2xl text-[#16A34A]">50+</div><div className="text-xs text-[#64748B] mt-1">Kripto varlık</div></div>
      </div>
    </InfoPage>
  );
}

export function Blog() {
  const posts = [
    { t: "Bitcoin halving sonrası beklentiler", d: "2026 yarılanması sonrası piyasa dinamikleri", date: "12 Nisan 2026" },
    { t: "TRY ile USDT almanın en hızlı yolu", d: "IBAN'dan stabilcoin'e: adım adım rehber", date: "5 Nisan 2026" },
    { t: "BERX nedir, neye yarar?", d: "Coinberx yerel coininin kullanım avantajları", date: "20 Mart 2026" },
  ];
  return (
    <InfoPage title="Blog" subtitle="Kripto, piyasa analizleri ve Coinberx duyuruları.">
      <div className="space-y-3 mt-2">
        {posts.map((p) => (
          <div key={p.t} className="card-surface p-5">
            <div className="text-xs text-[#64748B]">{p.date}</div>
            <div className="font-display text-xl mt-1">{p.t}</div>
            <div className="text-sm text-[#64748B] mt-2">{p.d}</div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Career() {
  return (
    <InfoPage title="Kariyer" subtitle="Türkiye'nin en hızlı büyüyen kripto borsasında çalışmak ister misiniz?">
      <p>Coinberx ekibi büyüyor. Yetenekli mühendisler, ürün tasarımcıları ve müşteri başarısı uzmanları arıyoruz.</p>
      <div className="space-y-3 mt-4">
        {["Senior Backend Engineer (Python)", "Mobile Developer (React Native)", "Trading Operations Specialist", "Müşteri Destek Uzmanı"].map((r) => (
          <div key={r} className="card-surface p-5 flex items-center justify-between">
            <div><div className="font-medium">{r}</div><div className="text-xs text-[#64748B] mt-1">İstanbul · Tam zamanlı</div></div>
            <a href="mailto:kariyer@coinberx.com" className="btn-primary px-4 py-2 rounded-lg text-sm">Başvur</a>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Press() {
  return (
    <InfoPage title="Basın" subtitle="Coinberx hakkında medya kaynakları ve basın bültenleri.">
      <p>Basın ile ilgili tüm sorularınız için <a href="mailto:basin@coinberx.com" className="text-[#16A34A]">basin@coinberx.com</a> adresine yazabilirsiniz.</p>
      <div className="card-surface p-5 mt-4">
        <div className="font-display text-lg">Marka Kiti</div>
        <div className="text-sm text-[#64748B] mt-1">Coinberx logoları, renk paleti ve marka rehberi.</div>
        <button className="btn-primary mt-4 px-4 py-2 rounded-lg text-sm">İndir (ZIP)</button>
      </div>
    </InfoPage>
  );
}

export function Help() {
  const topics = [
    { t: "Hesap Açılışı & KYC", d: "Hesap oluşturma, kimlik doğrulama adımları" },
    { t: "IBAN ile Para Yatırma", d: "Referans kodu, dekont ve sürelere dair her şey" },
    { t: "Trading & Emirler", d: "Market vs Limit emirler, komisyonlar" },
    { t: "Güvenlik", d: "Şifre yönetimi, oturum kontrolü" },
  ];
  return (
    <InfoPage title="Yardım Merkezi" subtitle="Sıkça sorulan konular ve adım adım rehberler.">
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        {topics.map((t) => (
          <div key={t.t} className="card-surface p-5 hover:border-[#16A34A]/40 transition">
            <div className="font-display text-lg text-[#16A34A]">{t.t}</div>
            <div className="text-sm text-[#64748B] mt-2">{t.d}</div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function FAQ() {
  const items = [
    ["TL yatırma ne kadar sürer?", "Mesai saatlerinde 5-15 dakika, hafta sonu 1 saati bulabilir."],
    ["Minimum yatırma tutarı nedir?", "Varsayılan olarak 50 TL (admin tarafından değiştirilebilir)."],
    ["Komisyon oranı nedir?", "Spot işlemler için %0,1 sabit komisyon. BERX holding'i ile %25'e kadar indirim."],
    ["KYC zorunlu mu?", "Türkiye mevzuatı gereği para çekme ve işlem yapma için KYC gereklidir."],
    ["BERX nedir?", "Coinberx'in yerel coinidir; tutmak komisyon indirimi ve VIP seviye avantajı sağlar."],
    ["USDT için hangi ağları destekliyorsunuz?", "TRC20, ERC20 ve BEP20. Her işlemde ağ seçimi zorunludur."],
  ];
  return (
    <InfoPage title="Sıkça Sorulan Sorular">
      <div className="space-y-3 mt-2">
        {items.map(([q, a]) => (
          <div key={q} className="card-surface p-5">
            <div className="font-medium text-[#16A34A]">{q}</div>
            <div className="text-sm text-[#64748B] mt-2">{a}</div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Contact() {
  return (
    <InfoPage title="İletişim" subtitle="Bize ulaşmanın en hızlı yolları.">
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        <div className="card-surface p-6">
          <div className="text-xs text-[#64748B] uppercase">Müşteri Hizmetleri</div>
          <div className="font-display text-lg mt-1">destek@coinberx.com</div>
          <div className="text-sm text-[#64748B] mt-1">7/24 yanıt</div>
        </div>
        <div className="card-surface p-6">
          <div className="text-xs text-[#64748B] uppercase">Telefon</div>
          <div className="font-display text-lg mt-1">0850 000 00 00</div>
          <div className="text-sm text-[#64748B] mt-1">Pzt-Cum 09:00-18:00</div>
        </div>
        <div className="card-surface p-6">
          <div className="text-xs text-[#64748B] uppercase">Basın</div>
          <div className="font-display text-lg mt-1">basin@coinberx.com</div>
        </div>
        <div className="card-surface p-6">
          <div className="text-xs text-[#64748B] uppercase">Adres</div>
          <div className="font-display text-base mt-1">Maslak / İstanbul</div>
        </div>
      </div>
    </InfoPage>
  );
}

export function Security() {
  const items = [
    ["Soğuk cüzdan", "Kullanıcı varlıklarının %95'ten fazlası internet bağlantısı olmayan soğuk cüzdanlarda saklanır."],
    ["İki adımlı doğrulama", "Hesabınıza Google Authenticator veya SMS ile ek güvenlik katmanı ekleyin."],
    ["Şifreli iletişim", "Tüm trafik HTTPS/TLS 1.3 ile uçtan uca şifrelidir; çerezler HTTP-only + Secure'dir."],
    ["IP & oturum izleme", "Profil sayfanızdan giriş geçmişinizi inceleyip şüpheli oturumları sonlandırabilirsiniz."],
    ["KYC/AML uyumu", "MASAK ve diğer regülasyonlara uygun kimlik doğrulama akışı."],
    ["Şifre hijyeni", "Şifreler bcrypt ile saklanır, brute-force koruması her e-posta için 5 başarısız denemeden sonra 15 dk kilit uygular."],
  ];
  return (
    <InfoPage title="Güvenlik" subtitle="Coinberx'te varlığınızı koruyan katmanlar.">
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        {items.map(([h, d]) => (
          <div key={h} className="card-surface p-5">
            <div className="font-display text-lg text-[#16A34A]">{h}</div>
            <div className="text-sm text-[#64748B] mt-2">{d}</div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}

export function Terms() {
  return (
    <InfoPage title="Kullanım Şartları" subtitle="Coinberx hizmetlerini kullanırken geçerli olan koşullar.">
      <p><strong>1. Taraflar.</strong> İşbu Sözleşme, Coinberx Yatırım Hizmetleri A.Ş. ("Coinberx") ile platforma kayıt olan gerçek/tüzel kişi ("Kullanıcı") arasında akdedilmiştir.</p>
      <p><strong>2. Hizmet kapsamı.</strong> Coinberx, kripto varlıkların alım, satım, saklama ve transferine yönelik aracılık hizmeti sunar. Coinberx fiyat tavsiyesi vermez; tüm işlemler kullanıcı sorumluluğundadır.</p>
      <p><strong>3. Hesap & KYC.</strong> Türkiye mevzuatı gereği para çekme ve belirli işlemler için kimlik doğrulama (KYC) zorunludur. Kullanıcı, sağlanan bilgilerin doğruluğundan sorumludur.</p>
      <p><strong>4. Komisyonlar.</strong> Güncel komisyon ve limit tablosu /fees sayfasında yayımlanır; Coinberx önceden bildirim ile değişiklik yapma hakkını saklı tutar.</p>
      <p><strong>5. Yasaklı kullanım.</strong> Yasa dışı işlemler, sahtekarlık, manipülasyon, otomatik araç ile saldırı, Coinberx hesabınızın askıya alınmasına neden olur.</p>
      <p><strong>6. Sorumluluk reddi.</strong> Piyasa volatilitesinden kaynaklanan zararlardan Coinberx sorumlu değildir. Detaylı uyarılar için /risk sayfasını inceleyiniz.</p>
      <p><strong>7. Geçerli hukuk.</strong> Türkiye Cumhuriyeti kanunları uygulanır; ihtilaflar İstanbul Mahkemeleri'nde çözülür.</p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage title="Gizlilik Politikası" subtitle="Verileriniz nasıl saklanıyor, kim erişebilir, ne kadar süreyle tutulur.">
      <p>Coinberx, KVKK (6698 sayılı Kanun) ve ilgili mevzuat çerçevesinde kişisel verilerinizi işler.</p>
      <p><strong>Toplanan veriler:</strong> ad-soyad, TC kimlik no, doğum tarihi, e-posta, telefon, IP adresi, oturum logları, KYC belgeleri, banka IBAN bilgileri, işlem geçmişi.</p>
      <p><strong>Kullanım amacı:</strong> MASAK uyumlu kimlik doğrulama, dolandırıcılık önleme, hizmet sunumu, müşteri destek iletişimi.</p>
      <p><strong>Saklama süresi:</strong> Yasal yükümlülükler çerçevesinde minimum 10 yıl (BDDK & MASAK), bu sürenin sonunda silinir veya anonimleştirilir.</p>
      <p><strong>Üçüncü taraf paylaşımı:</strong> Sadece yasal merci talepleri (MASAK, mahkeme) ve hizmet altyapı sağlayıcıları (banka, KYC doğrulama, e-posta servisi) ile paylaşılır.</p>
      <p><strong>Haklarınız:</strong> Verilerinize erişme, düzeltme, silme talebi için <a href="mailto:kvkk@coinberx.com" className="text-[#16A34A]">kvkk@coinberx.com</a> adresine yazabilirsiniz.</p>
    </InfoPage>
  );
}

export function Risk() {
  return (
    <InfoPage title="Risk Bildirimi" subtitle="Kripto para işlemlerinden önce mutlaka okumanız gerekenler.">
      <p><strong>Yüksek volatilite.</strong> Kripto varlıkların fiyatları kısa sürede yüksek oranda dalgalanabilir. Yatırdığınız sermayenin tamamını kaybedebilirsiniz.</p>
      <p><strong>Regülasyon riski.</strong> Türkiye veya küresel düzenleyiciler kripto varlıklara yönelik yasak/sınırlama getirebilir; bu durum likiditeyi ve fiyatı doğrudan etkileyebilir.</p>
      <p><strong>Teknoloji riski.</strong> Akıllı kontrat hataları, ağ saldırıları, cüzdan kayıpları geri döndürülemez olabilir.</p>
      <p><strong>Likidite riski.</strong> Düşük hacimli coinlerde alım/satım fiyatları arasında büyük fark oluşabilir.</p>
      <p><strong>Yatırım tavsiyesi değildir.</strong> Coinberx üzerindeki içerikler, fiyat verileri ve grafikler yalnızca bilgi amaçlıdır; yatırım kararı vermeden önce profesyonel danışmanlık alın.</p>
      <p><strong>Tavsiye.</strong> Yalnızca kaybetmeyi göze alabileceğiniz tutarlarla işlem yapın.</p>
    </InfoPage>
  );
}

export function Fees() {
  const rows = [
    ["Spot al-sat komisyonu", "%0,1", "BERX holding ile %25'e kadar indirim"],
    ["TL yatırma (IBAN)", "Ücretsiz", "İlk ay sınırsız"],
    ["TL çekme (IBAN)", "%0,1 (min 5 TL)", "Onay sonrası 5-15 dk"],
    ["Kripto yatırma", "Ücretsiz", "Ağ ücreti hariç"],
    ["Kripto çekme (TRC20)", "5 TRY (min 10 TRY)", "2 dk onay süresi"],
    ["Kripto çekme (ERC20)", "150 TRY (min 200 TRY)", "10 dk onay süresi"],
    ["Kripto çekme (BEP20)", "3 TRY (min 10 TRY)", "3 dk onay süresi"],
    ["İç transfer", "%0,05", "Coinberx kullanıcıları arası"],
  ];
  return (
    <InfoPage title="Ücretler" subtitle="Coinberx işlem ve hizmet ücretleri.">
      <div className="card-surface overflow-x-auto mt-2">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#64748B] text-left"><th className="px-4 py-3">İşlem</th><th>Ücret</th><th>Not</th></tr></thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {rows.map(([a, b, c]) => (
              <tr key={a}><td className="px-4 py-3 font-medium">{a}</td><td className="text-[#16A34A] font-medium">{b}</td><td className="text-xs text-[#64748B]">{c}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#64748B] mt-4">Tüm ücretler bilgilendirme amaçlıdır; güncel limitler için <a href="/api/settings" className="text-[#16A34A]">/api/settings</a> endpoint'ini de inceleyebilirsiniz.</p>
    </InfoPage>
  );
}

export function Announcements() {
  const items = [
    { d: "10 Şubat 2026", t: "BERX yerel coini lansman duyurusu", b: "Coinberx Token (BERX) tüm kullanıcılar için aktif. Tutmak komisyon indirimi ve VIP-eşdeğer avantaj sağlar." },
    { d: "1 Şubat 2026", t: "Yeni ağ desteği: BASE, OPTIMISM, ARBITRUM", b: "USDT ve ETH için L2 ağlarda yatırma/çekme aktiftir; ücretler ana ağa göre çok daha düşük." },
    { d: "15 Ocak 2026", t: "Mobil bottom navigation güncellemesi", b: "Mobilde işlem sayfalarına daha hızlı erişim için yenilenen alt menü." },
  ];
  return (
    <InfoPage title="Duyurular" subtitle="Coinberx'ten önemli güncellemeler.">
      <div className="space-y-3 mt-2">
        {items.map((it) => (
          <div key={it.t} className="card-surface p-5">
            <div className="text-xs text-[#64748B]">{it.d}</div>
            <div className="font-display text-lg mt-1">{it.t}</div>
            <div className="text-sm text-[#475569] mt-2">{it.b}</div>
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
