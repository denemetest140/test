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
