/* Dil desteği: Türkçe (varsayılan) · Rusça · İngilizce
 *
 * Sayfaların HTML'i Türkçe kalır — tarayıcı ve arama motoru Türkçe içeriği
 * olduğu gibi görür. Diğer diller metin düğümü düzeyinde çevrilir: sözlükte
 * karşılığı olan her metin değiştirilir, olmayan (telefon, e-posta, sayı,
 * marka adı) olduğu gibi bırakılır.
 *
 * Neden bu yöntem: proje kuralı gereği alt dizin (/ru/, /en/) ve derleme adımı
 * yok; her sayfa kökte tek dosya. Sözlüğe bir satır eklemek, üç dilde de
 * çalışan bir metin eklemeye yeter.
 */
(function () {
  "use strict";

  var LANGS = { tr: "TR", ru: "RU", en: "EN" };
  var STORE = "mrd-lang";

  /* Sözlük anahtarı = sayfadaki Türkçe metnin boşlukları sadeleştirilmiş hâli. */
  var DICT = {
    ru: {
      "MRD Group — Market, İnşaat ve Enerji": "MRD Group — ритейл, строительство и энергетика",
      "İçeriğe geç": "Перейти к содержанию",
      "Hakkımızda": "О нас",
      "Market": "Ритейл",
      "İnşaat": "Строительство",
      "Enerji": "Энергетика",
      "İletişim": "Контакты",
      "Türkiye": "Турция",
      "Market.": "Ритейл.",
      "İnşaat.": "Строительство.",
      "Enerji.": "Энергетика.",
      "Tek çatı.": "Одна группа.",
      "Üç ayrı sektörde faaliyet gösteren, tek bir yönetim anlayışıyla çalışan bir grup.": "Группа, работающая в трёх отраслях с единым подходом к управлению.",
      "Aşağı kaydırın": "Прокрутите вниз",
      "01 — Kurumsal": "01 — О группе",
      "Farklı sektörler,": "Разные отрасли,",
      "aynı standart.": "один стандарт.",
      "Ticaret, yapı ve enerji birbirinden bağımsız alanlar gibi görünür. Bizim için üçü de aynı temele dayanır: gerçekçi planlama, şeffaf yönetim ve verdiği sözü tutan bir organizasyon.": "Торговля, строительство и энергетика кажутся независимыми областями. Для нас все три опираются на одно основание: реалистичное планирование, прозрачное управление и организация, которая держит слово.",
      "MRD Group çatısı altındaki işler kendi alanlarında bağımsız yürütülür; ancak hepsi aynı kurumsal ölçütle denetlenir.": "Направления в составе MRD Group ведутся самостоятельно в своих областях, но контролируются по единым корпоративным критериям.",
      "Bize ulaşın": "Свяжитесь с нами",
      "Faaliyet sektörü": "Отрасли деятельности",
      "Amiral proje alanı": "Площадь флагманского проекта",
      "Mağaza · Cizre Park": "Магазины · Cizre Park",
      "Konut · Cizre Park": "Жильё · Cizre Park",
      "Amiral projemiz": "Наш флагманский проект",
      "2020 · Karma kullanım": "2020 · Смешанное назначение",
      "Cizre Park Alışveriş ve Yaşam Merkezi": "Торгово-жилой центр Cizre Park",
      "2020 yılında": "В 2020 году",
      "hizmete açılan Cizre Park, bölgenin ilk ve tek alışveriş merkezi. Alışveriş, eğlence ve konut aynı projede bir araya getirildi — planlamadan teslimata kadar tüm süreç grup bünyesinde yürütüldü.": "открытый Cizre Park — первый и единственный торговый центр региона. Торговля, развлечения и жильё объединены в одном проекте: весь процесс от планирования до сдачи вёлся силами группы.",
      "Gün ışığı alan açık hava konsepti, 26 mağazalık alışveriş alanı, 5 salonlu sineması ve 128 konutluk yaşam alanıyla bölgenin çehresini değiştirdi.": "Открытая концепция с естественным светом, торговая зона на 26 магазинов, кинотеатр на 5 залов и жилая зона на 128 квартир изменили облик региона.",
      "Projeyi inceleyin": "Смотреть проект",
      "01 — Market": "01 — Ритейл",
      "Market ve": "Ритейл и",
      "perakende": "розничная торговля",
      "; 2020'den bu yana bölgenin ilk ve tek AVM'si. Açık hava konsepti, ulusal markaları, sinema ve geniş çocuk alanıyla alışverişi günlük yaşamla buluşturur.": "; с 2020 года — первый и единственный ТЦ региона. Открытая концепция, национальные бренды, кинотеатр и просторная детская зона соединяют покупки с повседневной жизнью.",
      "Alışveriş": "Покупки",
      "Sinema & eğlence": "Кино и развлечения",
      "Yeme & içme": "Кафе и рестораны",
      "Yaşam alanları": "Жилые зоны",
      "Market'i inceleyin": "Смотреть ритейл",
      "02 — İnşaat": "02 — Строительство",
      "İnşaat ve": "Строительство и",
      "taahhüt": "подряд",
      "Konut ve ticari yapı projeleri. Planlamadan teslimata kadar tüm süreci kendi ekibimizle yürütüyor, kalite ve takvim sözünü aynı anda tutuyoruz.": "Жилые и коммерческие проекты. Весь процесс от планирования до сдачи ведём своей командой, соблюдая и качество, и сроки.",
      "Konut projeleri": "Жилые проекты",
      "Ticari yapılar": "Коммерческие здания",
      "Taahhüt işleri": "Подрядные работы",
      "Proje yönetimi": "Управление проектом",
      "İnşaat'ı inceleyin": "Смотреть строительство",
      "03 — Enerji": "03 — Энергетика",
      "Enerji ve": "Энергетика и",
      "çözümler": "решения",
      "Enerji tedariki ve çözümleri. Öngörülebilir tedarik ve verimlilik odağıyla bölgedeki işletmelerin enerji ihtiyacını sürdürülebilir biçimde karşılıyoruz.": "Поставка энергии и решения. Предсказуемые поставки и фокус на эффективности позволяют устойчиво закрывать потребности предприятий региона.",
      "Enerji tedariki": "Поставка энергии",
      "Enerji çözümleri": "Энергетические решения",
      "Kurumsal tedarik": "Корпоративные поставки",
      "Verimlilik": "Эффективность",
      "Enerji'yi inceleyin": "Смотреть энергетику",
      "Yaklaşımımız": "Наш подход",
      "02 — Nasıl çalışırız": "02 — Как мы работаем",
      "Entegre yapı": "Единая структура",
      "Üç sektör aynı çatı altında planlanır; kaynak ve tecrübe işler arasında paylaşılır.": "Три отрасли планируются под одной крышей; ресурсы и опыт распределяются между направлениями.",
      "Bölgesel güç": "Сила в регионе",
      "Bölgeyi ve yerel iş yapma biçimini yakından tanıyan bir yapıdayız.": "Мы хорошо знаем регион и местную деловую практику.",
      "Süreklilik": "Постоянство",
      "Kısa vadeli fırsatlar yerine uzun soluklu iş ilişkileri kurmayı tercih ediyoruz.": "Вместо краткосрочных возможностей мы строим долгосрочные деловые отношения.",
      "Şeffaflık": "Прозрачность",
      "Fiyat, takvim ve kapsam baştan yazılır; süreç boyunca aynı kalır.": "Цена, сроки и объём фиксируются заранее и не меняются по ходу работы.",
      "03 — İletişim": "03 — Контакты",
      "Konuşarak başlayalım.": "Начнём с разговора.",
      "Proje, tedarik veya iş birliği için doğrudan ulaşabilirsiniz. Form doldurmanıza gerek yok.": "По проектам, поставкам или сотрудничеству можно обратиться напрямую. Заполнять форму не нужно.",
      "Üç sektör, tek çatı.": "Три отрасли, одна группа.",
      "Sektörler": "Отрасли",
      "Market ve perakende": "Ритейл и розничная торговля",
      "İnşaat ve taahhüt": "Строительство и подряд",
      "Kurumsal": "О группе",
      "Çalışma ilkelerimiz": "Наши принципы работы",
      "MRD Group. Tüm hakları saklıdır.": "MRD Group. Все права защищены.",
      "İnşaat ve Taahhüt — MRD Group": "Строительство и подряд — MRD Group",
      "02 — Konut · ticari · taahhüt": "02 — Жильё · коммерция · подряд",
      "Zeminden": "От фундамента",
      "teslime.": "до сдачи.",
      "Konut ve ticari yapı projeleri. Planlamadan anahtar teslimine kadar süreci tek elden yürütüyoruz.": "Жилые и коммерческие проекты. Ведём процесс из одних рук — от планирования до сдачи под ключ.",
      "Ne yapıyoruz": "Чем мы занимаемся",
      "Takvim de bir taahhüttür": "Срок — тоже обязательство",
      "İnşaat bölümümüz konut ve ticari yapı projeleri geliştirir; ayrıca üçüncü taraflar için taahhüt işleri üstlenir. Projelendirme, ruhsat süreçleri, saha yönetimi ve teslim aynı ekip tarafından takip edilir.": "Наше строительное направление развивает жилые и коммерческие проекты, а также выполняет подрядные работы для третьих сторон. Проектирование, разрешения, управление площадкой и сдачу ведёт одна команда.",
      "Bir işi kabul etmeden önce takvimi ve maliyeti gerçekçi biçimde hesaplarız. Verdiğimiz tarihe uymak, kullandığımız malzeme kadar işin bir parçasıdır.": "Прежде чем взять работу, мы реалистично считаем сроки и стоимость. Соблюдение названной даты — такая же часть работы, как и материалы.",
      "Planlama, uygulama ve teslim süreçlerinin tamamı kendi ekibimizle.": "Планирование, исполнение и сдача — полностью своей командой.",
      "İş yeri, depo ve ticari alan yapıları için uçtan uca çözüm.": "Комплексное решение для офисов, складов и коммерческих площадей.",
      "Üçüncü taraf projelerde sözleşmeli yüklenicilik.": "Подрядные работы по договору в проектах третьих сторон.",
      "Takvim, maliyet ve kalite kontrolünün tek merkezden takibi.": "Контроль сроков, стоимости и качества из единого центра.",
      "Yapı sistemi": "Конструктивная система",
      "Zeminden çatıya": "От фундамента до кровли",
      "Temel, kolonlar, döşemeler ve çekirdek. Bir yapıyı ayakta tutan sistem, kaplama gelmeden önce kurulur — ve işin kalitesi burada belli olur.": "Фундамент, колонны, перекрытия и ядро. Система, которая держит здание, собирается до отделки — и именно здесь видно качество работы.",
      "Kaydırarak yükseltin · sürükleyerek çevirin": "Прокрутка — этажи · перетаскивание — поворот",
      "Referans proje": "Референс-проект",
      "Konut · ticari": "Жильё · коммерция",
      "tamamlanan karma kullanımlı projemiz: yaklaşık": "завершённый проект смешанного назначения: около",
      "yapı alanı,": "площади застройки,",
      "128 konutluk": "128 квартир",
      "yaşam alanı ve": "жилой зоны и",
      "26 mağazalık": "26 магазинов",
      "ticari alan aynı yapıda bir araya getirildi.": "коммерческой площади объединены в одном здании.",
      "Konut, ticari yapı ve ortak alanların birlikte planlandığı bu ölçekte bir projeyi baştan sona kendi ekibimizle yürüttük.": "Проект такого масштаба, где жильё, коммерция и общие зоны планировались вместе, мы провели от начала до конца своей командой.",
      "Proje görselleri": "Изображения проекта",
      "Örnek galeri": "Пример галереи",
      "Görseller örnek amaçlıdır; firmanın kendi fotoğraflarıyla değiştirilecektir.": "Изображения приведены как пример; будут заменены собственными фотографиями компании.",
      "MRD Group'un diğer alanları": "Другие направления MRD Group",
      "Cizre Park Alışveriş ve Yaşam Merkezi — alışveriş, market ve perakende.": "Торгово-жилой центр Cizre Park — торговля, ритейл и розница.",
      "Enerji tedariki, enerji çözümleri ve verimlilik.": "Поставка энергии, энергетические решения и эффективность.",
      "Projenizi konuşalım.": "Обсудим ваш проект.",
      "Yeni proje, taahhüt işi veya iş birliği için bize ulaşın.": "Свяжитесь с нами по новому проекту, подряду или сотрудничеству.",
      "İletişim sayfası": "Страница контактов",
      "Enerji — MRD Group": "Энергетика — MRD Group",
      "03 — Tedarik · çözümler · verimlilik": "03 — Поставки · решения · эффективность",
      "Kesintisiz": "Бесперебойная",
      "güç.": "энергия.",
      "Enerji tedariki ve çözümleri. Bölgedeki işletmelerin enerji ihtiyacını güvenilir ve sürdürülebilir biçimde karşılıyoruz.": "Поставка энергии и решения. Надёжно и устойчиво закрываем потребности предприятий региона.",
      "Enerji, planlanabilir olmalı": "Энергия должна быть планируемой",
      "Enerji bölümümüz, işletmelerin enerji tedariki ve çözümleri alanında faaliyet gösterir. Düzenli tedarik programı kurar, tüketim takibini ve planlamayı birlikte yürütürüz.": "Наше энергетическое направление занимается поставками энергии и решениями для предприятий. Мы выстраиваем регулярную программу поставок и ведём учёт потребления и планирование вместе с клиентом.",
      "Enerji, üretimi durduran bir belirsizlik olmamalıdır. Bu yüzden tedariki öngörülebilir kılar, verimlilik ve süreklilik odağıyla çalışırız.": "Энергия не должна быть неопределённостью, останавливающей производство. Поэтому мы делаем поставки предсказуемыми и работаем с фокусом на эффективность и непрерывность.",
      "İşletmeler için düzenli ve öngörülebilir enerji tedariki.": "Регулярные и предсказуемые поставки энергии для предприятий.",
      "İhtiyaca göre kurgulanan enerji altyapısı ve planlama.": "Энергетическая инфраструктура и планирование под конкретную задачу.",
      "İşletmeler için sözleşmeli, sürekli tedarik programları.": "Договорные программы постоянных поставок для предприятий.",
      "Enerji verimliliğine yönelik danışmanlık ve iyileştirme.": "Консультации и улучшения в области энергоэффективности.",
      "Hizmet kapsamı": "Объём услуг",
      "Faaliyet bölgesi": "Регион деятельности",
      "Enerji tedarik ağı": "Сеть поставок энергии",
      "Hizmet verdiğimiz bölgeler, tedarik koşulları ve sözleşmeli enerji seçenekleri hakkında detaylı bilgi için bize ulaşabilirsiniz.": "За подробностями о регионах обслуживания, условиях поставок и договорных вариантах свяжитесь с нами.",
      "Teklif isteyin": "Запросить предложение",
      "Saha görselleri": "Изображения с объектов",
      "Konut ve ticari yapı projeleri, taahhüt işleri ve proje yönetimi.": "Жилые и коммерческие проекты, подрядные работы и управление проектами.",
      "Tedarik programı kuralım.": "Составим программу поставок.",
      "Kurumsal enerji ihtiyacınız için bize ulaşın.": "Свяжитесь с нами по корпоративным потребностям в энергии.",
      "Hakkımızda — MRD Group": "О нас — MRD Group",
      "Üç sektör,": "Три отрасли,",
      "bir anlayış.": "один подход.",
      "MRD Group; market ve perakende, inşaat ve taahhüt, enerji alanlarında faaliyet gösteren bir gruptur. Her iş kendi alanında bağımsız yürütülür; hepsi aynı kurumsal ölçütle denetlenir.": "MRD Group — группа, работающая в сферах ритейла и розничной торговли, строительства и подряда, энергетики. Каждое направление ведётся самостоятельно, но контролируется по единым корпоративным критериям.",
      "01 — Kimiz": "01 — Кто мы",
      "Farklı işler,": "Разные направления,",
      "tek bir yönetim": "единое управление",
      "Ticaret, yapı ve enerji ilk bakışta birbirinden uzak alanlar gibi görünür. Bizim için üçü de aynı temele dayanır: gerçekçi planlama, şeffaf yönetim ve verilen sözü tutan bir organizasyon.": "Торговля, строительство и энергетика на первый взгляд кажутся далёкими друг от друга. Для нас все три опираются на одно основание: реалистичное планирование, прозрачное управление и организация, которая держит слово.",
      "Grup bünyesindeki her iş, kendi sektörünün gereklerine göre bağımsız yürütülür. Ancak takvim, maliyet ve kalite aynı merkezden aynı ölçütlerle denetlenir. Bir alanda edinilen tecrübe diğerine taşınır; bir projede kurulan tedarik ilişkisi bütün grubun kazancı olur.": "Каждое направление группы ведётся самостоятельно, по требованиям своей отрасли. Но сроки, стоимость и качество контролируются из одного центра по единым критериям. Опыт одной области переносится в другую; связь с поставщиком, выстроенная в одном проекте, становится выигрышем для всей группы.",
      "Yatırımlarımızı, bulunduğumuz bölgeye kalıcı değer katacak işler üzerine kuruyoruz. Bir yapının teslim edilmesiyle iş bitmiyor; işletmesi, bakımı ve sürekliliği de bizim sorumluluğumuz.": "Мы строим инвестиции вокруг работ, создающих долговременную ценность для нашего региона. Сдача здания не завершает работу: эксплуатация, обслуживание и непрерывность — тоже наша ответственность.",
      "hizmete açılan Cizre Park, bölgenin ilk ve tek alışveriş merkezi olarak planlandı. Alışveriş, eğlence ve konut tek bir projede bir araya getirildi; süreç planlamadan teslimata kadar grup bünyesinde yürütüldü.": "открытый Cizre Park задумывался как первый и единственный торговый центр региона. Торговля, развлечения и жильё объединены в одном проекте; процесс от планирования до сдачи вёлся силами группы.",
      "Gün ışığı alan açık hava konsepti, ulusal seçkin markaları ve geniş ortak alanlarıyla proje, yalnızca bir alışveriş noktası değil; bölge için bir buluşma alanı oldu.": "Открытая концепция с естественным светом, известные национальные бренды и просторные общие зоны сделали проект не просто точкой покупок, а местом встреч для региона.",
      "Proje alanı": "Площадь проекта",
      "Mağaza": "Магазины",
      "Konut": "Жильё",
      "Sinema salonu": "Кинозалы",
      "Nasıl çalışırız": "Как мы работаем",
      "Söz verilen takvim": "Обещанные сроки",
      "Bir işi kabul etmeden önce takvimi ve maliyeti gerçekçi hesaplarız. Verilen tarihe uymak, kullanılan malzeme kadar işin parçasıdır.": "Прежде чем взять работу, мы реалистично считаем сроки и стоимость. Соблюдение названной даты — такая же часть работы, как и материалы.",
      "Tek elden sorumluluk": "Ответственность из одних рук",
      "Projelendirme, saha yönetimi ve teslim aynı ekip tarafından takip edilir. Sorumluluğun bölündüğü yerde hesap sorulamaz.": "Проектирование, управление площадкой и сдачу ведёт одна команда. Там, где ответственность разделена, спросить не с кого.",
      "Teslimden sonrası": "После сдачи",
      "İşimiz anahtar teslimiyle bitmiyor. İşletme, bakım ve süreklilik de aynı özenle yürütülür.": "Наша работа не заканчивается сдачей под ключ. Эксплуатация, обслуживание и непрерывность ведутся с той же тщательностью.",
      "Bölgeye kalıcı değer": "Долговременная ценность для региона",
      "Yatırımlarımızı, bulunduğumuz bölgede kalıcı karşılığı olan işler üzerine kuruyoruz.": "Мы строим инвестиции вокруг работ, имеющих долговременную отдачу в нашем регионе.",
      "Faaliyet alanlarımız": "Наши направления",
      "Üç sektör": "Три отрасли",
      "Alışveriş ve perakende": "Торговля и розница",
      "Cizre Park Alışveriş ve Yaşam Merkezi ile alışveriş, market ve günlük yaşam bir arada.": "Торгово-жилой центр Cizre Park: торговля, ритейл и повседневная жизнь вместе.",
      "Konut ve ticari yapı": "Жильё и коммерческие здания",
      "Konut projeleri, ticari yapılar ve taahhüt işleri; planlamadan teslime kadar tek elden.": "Жилые проекты, коммерческие здания и подрядные работы — от планирования до сдачи из одних рук.",
      "Tedarik ve çözümler": "Поставки и решения",
      "Kurumsal enerji tedariki ve verimlilik çözümleriyle işletmelere destek.": "Поддержка предприятий корпоративными поставками энергии и решениями по эффективности.",
      "Bizi arayın": "Позвоните нам",
      "İletişim — MRD Group": "Контакты — MRD Group",
      "04 — İletişim": "04 — Контакты",
      "Doğrudan": "Свяжитесь",
      "ulaşın.": "напрямую.",
      "Telefon": "Телефон",
      "E-posta": "E-mail",
      "Merkez": "Головной офис",
      "Çalışma saatleri": "Часы работы",
      "Her gün · 09.00 – 17.00": "Ежедневно · 09:00 – 17:00",
      "Hemen arayın": "Позвонить сейчас",
      "WhatsApp'tan yazın": "Написать в WhatsApp",
      "Haritada göster": "Показать на карте",
      "MRD Group merkez ofis · Harita: © OpenStreetMap": "Головной офис MRD Group · Карта: © OpenStreetMap",
      "Hangi konuda görüşmek istiyorsunuz?": "По какому вопросу вы хотите связаться?",
      "Cizre Park Alışveriş ve Yaşam Merkezi hakkında bilgi ve talepler.": "Информация и запросы по торгово-жилому центру Cizre Park.",
      "Proje ve taahhüt": "Проекты и подряд",
      "Yeni proje, referans listesi ve yüklenicilik görüşmeleri.": "Новые проекты, список референсов и переговоры о подряде.",
      "Kurumsal tedarik programı ve teklif talepleri.": "Корпоративные программы поставок и запросы предложений.",
      "Sayfa bulunamadı — MRD Group": "Страница не найдена — MRD Group",
      "Aradığınız sayfa bulunamadı": "Запрашиваемая страница не найдена",
      "Bağlantı taşınmış veya kaldırılmış olabilir. Ana sayfadan devam edebilirsiniz.": "Ссылка могла быть перемещена или удалена. Вы можете продолжить с главной страницы.",
      "Ana sayfa": "Главная",
      "Giriş": "Начало",
      "Yaklaşım": "Подход",
      "Amiral proje": "Флагманский проект",
      "Bölüm göstergesi": "Указатель разделов",
      "Ana menü": "Главное меню",
      "MRD Group ana sayfa": "MRD Group — главная",
      "Menüyü aç": "Открыть меню",

      "Cizre Park — Alışveriş ve Yaşam Merkezi | MRD Group": "Cizre Park — торгово-жилой центр | MRD Group",
      "01 — Alışveriş ve yaşam merkezi": "01 — Торгово-жилой центр",
      "Her şey,": "Всё —",
      "tek çatıda.": "под одной крышей.",
      "Cizre Park Alışveriş ve Yaşam Merkezi; 2020'den bu yana bölgenin ilk ve tek AVM'si olarak alışverişi, eğlenceyi ve günlük yaşamı açık hava konseptinde bir araya getirir.": "Торгово-жилой центр Cizre Park с 2020 года — первый и единственный ТЦ региона, объединяющий покупки, развлечения и повседневную жизнь в открытой концепции.",
      "Bölgenin ilk ve tek": "Первый и единственный",
      "alışveriş ve yaşam merkezi": "торгово-жилой центр региона",
      "Cizre Park Alışveriş ve Yaşam Merkezi,": "Торгово-жилой центр Cizre Park",
      "bölgenin ilk ve tek alışveriş merkezi olarak hizmete açıldı. Gün ışığı alan açık hava konsepti, modern mimarisi ve ulusal seçkin markalarıyla alışverişi günlük yaşamla bir araya getirir.": "открылся как первый и единственный торговый центр региона. Открытая концепция с естественным светом, современная архитектура и известные национальные бренды соединяют покупки с повседневной жизнью.",
      "Yaklaşık": "Около",
      "alan,": "площади,",
      "26 mağaza": "26 магазинов",
      "ve": "и",
      "yaşam alanıyla Cizre Park; bölge için bir alışveriş, eğlence ve yaşam noktasıdır.": "жилой зоны — Cizre Park стал точкой покупок, развлечений и жизни для региона.",
      "Konutluk yaşam alanı": "Квартир в жилой зоне",
      "Çocuk oyun alanı": "Детская игровая зона",
      "5 salonlu sinema, bowling ve çeşitli eğlence alanları.": "Кинотеатр на 5 залов, боулинг и различные зоны развлечений.",
      "Market & alışveriş": "Ритейл и покупки",
      "Süpermarket ve ulusal seçkin markalarla geniş perakende.": "Супермаркет и широкая розница с известными национальными брендами.",
      "Zengin lezzet seçenekleriyle ferah yeme-içme alanları.": "Просторные зоны питания с широким выбором кухонь.",
      "Aile & çocuk": "Семья и дети",
      "2.000 m²'lik çocuk oyun alanı ve aileye uygun ortak alanlar.": "Детская игровая зона 2 000 м² и общие пространства для семей.",
      "Bir çatı altında her şey": "Всё под одной крышей",
      "Hizmetler": "Услуги",
      "5 salonlu sinema": "Кинотеатр на 5 залов",
      "Süpermarket": "Супермаркет",
      "Yeme-içme alanları": "Зоны питания",
      "2.000 m² oyun alanı": "Игровая зона 2 000 м²",
      "Bowling": "Боулинг",
      "Elektrikli araç şarjı": "Зарядка электромобилей",
      "Ücretsiz Wi-Fi": "Бесплатный Wi-Fi",
      "Otopark & oto yıkama": "Парковка и автомойка",
      "Tam erişilebilirlik": "Полная доступность",
      "Mescit & bebek bakım": "Молельная и комната матери и ребёнка",
      "Konum": "Расположение",
      "Cizre · Şırnak": "Джизре · Ширнак",
      "Konak Mahallesi, Cizre-Silopi Yolu, Cizre / Şırnak — Irak-Silopi, Yeni Şırnak ve Mardin yollarının kesişiminde. Harita yaklaşık konumu gösterir. Harita: © OpenStreetMap.": "Район Конак, шоссе Джизре — Силопи, Джизре / Ширнак — на пересечении дорог Ирак-Силопи, Новый Ширнак и Мардин. Карта показывает приблизительное расположение. Карта: © OpenStreetMap.",
      "Ziyaret bilgileri": "Информация для посещения",
      "Gün ışığı alan açık hava konsepti ve ferah alanlarıyla Cizre Park, hafta boyunca ziyaretçilerini ağırlar.": "Благодаря открытой концепции с естественным светом и просторным зонам Cizre Park принимает посетителей всю неделю.",
      "Her gün 10.00 – 22.00": "Ежедневно 10:00 – 22:00",
      "Ücretsiz otopark & engelli otopark": "Бесплатная парковка и места для инвалидов",
      "Elektrikli araç şarj istasyonu": "Станция зарядки электромобилей",
      "Mescit · bebek bakım odası · revir": "Молельная · комната матери и ребёнка · медпункт",
      "İletişime geçin": "Связаться с нами",
      "Cizre Park'tan": "Из Cizre Park",
      "Gerçek görseller": "Реальные фотографии",
      "Cizre Park Alışveriş ve Yaşam Merkezi'nden kareler.": "Кадры из торгово-жилого центра Cizre Park.",
      "Tedarik için görüşelim.": "Обсудим поставки.",
      "İş birliği ve bilgi talepleriniz için bize ulaşın.": "Свяжитесь с нами по вопросам сотрудничества и информации."
    },

    en: {
      "MRD Group — Market, İnşaat ve Enerji": "MRD Group — Retail, Construction and Energy",
      "İçeriğe geç": "Skip to content",
      "Hakkımızda": "About",
      "Market": "Retail",
      "İnşaat": "Construction",
      "Enerji": "Energy",
      "İletişim": "Contact",
      "Türkiye": "Türkiye",
      "Market.": "Retail.",
      "İnşaat.": "Construction.",
      "Enerji.": "Energy.",
      "Tek çatı.": "One group.",
      "Üç ayrı sektörde faaliyet gösteren, tek bir yönetim anlayışıyla çalışan bir grup.": "A group operating in three sectors under a single management approach.",
      "Aşağı kaydırın": "Scroll down",
      "01 — Kurumsal": "01 — The group",
      "Farklı sektörler,": "Different sectors,",
      "aynı standart.": "one standard.",
      "Ticaret, yapı ve enerji birbirinden bağımsız alanlar gibi görünür. Bizim için üçü de aynı temele dayanır: gerçekçi planlama, şeffaf yönetim ve verdiği sözü tutan bir organizasyon.": "Trade, construction and energy look like unrelated fields. For us all three rest on the same foundation: realistic planning, transparent management and an organisation that keeps its word.",
      "MRD Group çatısı altındaki işler kendi alanlarında bağımsız yürütülür; ancak hepsi aynı kurumsal ölçütle denetlenir.": "The businesses under MRD Group run independently in their own fields, yet all are held to the same corporate standard.",
      "Bize ulaşın": "Get in touch",
      "Faaliyet sektörü": "Sectors of operation",
      "Amiral proje alanı": "Flagship project area",
      "Mağaza · Cizre Park": "Stores · Cizre Park",
      "Konut · Cizre Park": "Homes · Cizre Park",
      "Amiral projemiz": "Our flagship project",
      "2020 · Karma kullanım": "2020 · Mixed use",
      "Cizre Park Alışveriş ve Yaşam Merkezi": "Cizre Park Shopping and Living Centre",
      "2020 yılında": "Opened in 2020,",
      "hizmete açılan Cizre Park, bölgenin ilk ve tek alışveriş merkezi. Alışveriş, eğlence ve konut aynı projede bir araya getirildi — planlamadan teslimata kadar tüm süreç grup bünyesinde yürütüldü.": "Cizre Park is the region's first and only shopping centre. Retail, entertainment and housing were brought together in one project — the entire process, from planning to handover, was carried out within the group.",
      "Gün ışığı alan açık hava konsepti, 26 mağazalık alışveriş alanı, 5 salonlu sineması ve 128 konutluk yaşam alanıyla bölgenin çehresini değiştirdi.": "With its daylight-filled open-air concept, 26-store retail area, 5-screen cinema and 128-home living quarter, it changed the face of the region.",
      "Projeyi inceleyin": "View the project",
      "01 — Market": "01 — Retail",
      "Market ve": "Retail and",
      "perakende": "commerce",
      "; 2020'den bu yana bölgenin ilk ve tek AVM'si. Açık hava konsepti, ulusal markaları, sinema ve geniş çocuk alanıyla alışverişi günlük yaşamla buluşturur.": "; the region's first and only mall since 2020. Its open-air concept, national brands, cinema and generous children's area bring shopping together with everyday life.",
      "Alışveriş": "Shopping",
      "Sinema & eğlence": "Cinema & entertainment",
      "Yeme & içme": "Food & drink",
      "Yaşam alanları": "Living areas",
      "Market'i inceleyin": "View retail",
      "02 — İnşaat": "02 — Construction",
      "İnşaat ve": "Construction and",
      "taahhüt": "contracting",
      "Konut ve ticari yapı projeleri. Planlamadan teslimata kadar tüm süreci kendi ekibimizle yürütüyor, kalite ve takvim sözünü aynı anda tutuyoruz.": "Residential and commercial building projects. We run the whole process with our own team, from planning to handover, keeping both the quality and the schedule we promise.",
      "Konut projeleri": "Residential projects",
      "Ticari yapılar": "Commercial buildings",
      "Taahhüt işleri": "Contracting work",
      "Proje yönetimi": "Project management",
      "İnşaat'ı inceleyin": "View construction",
      "03 — Enerji": "03 — Energy",
      "Enerji ve": "Energy and",
      "çözümler": "solutions",
      "Enerji tedariki ve çözümleri. Öngörülebilir tedarik ve verimlilik odağıyla bölgedeki işletmelerin enerji ihtiyacını sürdürülebilir biçimde karşılıyoruz.": "Energy supply and solutions. With predictable supply and a focus on efficiency, we meet the energy needs of businesses in the region sustainably.",
      "Enerji tedariki": "Energy supply",
      "Enerji çözümleri": "Energy solutions",
      "Kurumsal tedarik": "Corporate supply",
      "Verimlilik": "Efficiency",
      "Enerji'yi inceleyin": "View energy",
      "Yaklaşımımız": "Our approach",
      "02 — Nasıl çalışırız": "02 — How we work",
      "Entegre yapı": "Integrated structure",
      "Üç sektör aynı çatı altında planlanır; kaynak ve tecrübe işler arasında paylaşılır.": "Three sectors are planned under one roof; resources and experience are shared between them.",
      "Bölgesel güç": "Regional strength",
      "Bölgeyi ve yerel iş yapma biçimini yakından tanıyan bir yapıdayız.": "We are an organisation that knows the region and how business is done locally.",
      "Süreklilik": "Continuity",
      "Kısa vadeli fırsatlar yerine uzun soluklu iş ilişkileri kurmayı tercih ediyoruz.": "We prefer to build long-term business relationships rather than chase short-term opportunities.",
      "Şeffaflık": "Transparency",
      "Fiyat, takvim ve kapsam baştan yazılır; süreç boyunca aynı kalır.": "Price, schedule and scope are set out at the start and stay the same throughout.",
      "03 — İletişim": "03 — Contact",
      "Konuşarak başlayalım.": "Let's start with a conversation.",
      "Proje, tedarik veya iş birliği için doğrudan ulaşabilirsiniz. Form doldurmanıza gerek yok.": "For projects, supply or partnership you can reach us directly. No form to fill in.",
      "Üç sektör, tek çatı.": "Three sectors, one group.",
      "Sektörler": "Sectors",
      "Market ve perakende": "Retail and commerce",
      "İnşaat ve taahhüt": "Construction and contracting",
      "Kurumsal": "Company",
      "Çalışma ilkelerimiz": "How we work",
      "MRD Group. Tüm hakları saklıdır.": "MRD Group. All rights reserved.",
      "İnşaat ve Taahhüt — MRD Group": "Construction and Contracting — MRD Group",
      "02 — Konut · ticari · taahhüt": "02 — Residential · commercial · contracting",
      "Zeminden": "From the ground",
      "teslime.": "to handover.",
      "Konut ve ticari yapı projeleri. Planlamadan anahtar teslimine kadar süreci tek elden yürütüyoruz.": "Residential and commercial projects. We run the process from planning to turnkey handover from a single hand.",
      "Ne yapıyoruz": "What we do",
      "Takvim de bir taahhüttür": "A schedule is a commitment too",
      "İnşaat bölümümüz konut ve ticari yapı projeleri geliştirir; ayrıca üçüncü taraflar için taahhüt işleri üstlenir. Projelendirme, ruhsat süreçleri, saha yönetimi ve teslim aynı ekip tarafından takip edilir.": "Our construction arm develops residential and commercial projects and also takes on contracting work for third parties. Design, permits, site management and handover are followed by the same team.",
      "Bir işi kabul etmeden önce takvimi ve maliyeti gerçekçi biçimde hesaplarız. Verdiğimiz tarihe uymak, kullandığımız malzeme kadar işin bir parçasıdır.": "Before accepting a job we calculate the schedule and cost realistically. Meeting the date we give is as much a part of the work as the materials we use.",
      "Planlama, uygulama ve teslim süreçlerinin tamamı kendi ekibimizle.": "Planning, execution and handover entirely with our own team.",
      "İş yeri, depo ve ticari alan yapıları için uçtan uca çözüm.": "End-to-end solutions for workplaces, warehouses and commercial spaces.",
      "Üçüncü taraf projelerde sözleşmeli yüklenicilik.": "Contracted execution on third-party projects.",
      "Takvim, maliyet ve kalite kontrolünün tek merkezden takibi.": "Schedule, cost and quality tracked from a single centre.",
      "Yapı sistemi": "Structural system",
      "Zeminden çatıya": "From ground to roof",
      "Temel, kolonlar, döşemeler ve çekirdek. Bir yapıyı ayakta tutan sistem, kaplama gelmeden önce kurulur — ve işin kalitesi burada belli olur.": "Foundation, columns, slabs and core. The system that holds a building up is built before any cladding arrives — and that is where the quality of the work shows.",
      "Kaydırarak yükseltin · sürükleyerek çevirin": "Scroll to raise · drag to rotate",
      "Referans proje": "Reference project",
      "Konut · ticari": "Residential · commercial",
      "tamamlanan karma kullanımlı projemiz: yaklaşık": "completed mixed-use project: approximately",
      "yapı alanı,": "of built area,",
      "128 konutluk": "128 homes",
      "yaşam alanı ve": "of living space and",
      "26 mağazalık": "26 stores",
      "ticari alan aynı yapıda bir araya getirildi.": "of commercial space brought together in one building.",
      "Konut, ticari yapı ve ortak alanların birlikte planlandığı bu ölçekte bir projeyi baştan sona kendi ekibimizle yürüttük.": "We carried a project of this scale — where housing, commercial space and shared areas were planned together — from start to finish with our own team.",
      "Proje görselleri": "Project images",
      "Örnek galeri": "Sample gallery",
      "Görseller örnek amaçlıdır; firmanın kendi fotoğraflarıyla değiştirilecektir.": "Images are placeholders and will be replaced with the company's own photographs.",
      "MRD Group'un diğer alanları": "Other areas of MRD Group",
      "Cizre Park Alışveriş ve Yaşam Merkezi — alışveriş, market ve perakende.": "Cizre Park Shopping and Living Centre — shopping, retail and commerce.",
      "Enerji tedariki, enerji çözümleri ve verimlilik.": "Energy supply, energy solutions and efficiency.",
      "Projenizi konuşalım.": "Let's talk about your project.",
      "Yeni proje, taahhüt işi veya iş birliği için bize ulaşın.": "Get in touch about a new project, contracting work or partnership.",
      "İletişim sayfası": "Contact page",
      "Enerji — MRD Group": "Energy — MRD Group",
      "03 — Tedarik · çözümler · verimlilik": "03 — Supply · solutions · efficiency",
      "Kesintisiz": "Uninterrupted",
      "güç.": "power.",
      "Enerji tedariki ve çözümleri. Bölgedeki işletmelerin enerji ihtiyacını güvenilir ve sürdürülebilir biçimde karşılıyoruz.": "Energy supply and solutions. We meet the energy needs of businesses in the region reliably and sustainably.",
      "Enerji, planlanabilir olmalı": "Energy should be predictable",
      "Enerji bölümümüz, işletmelerin enerji tedariki ve çözümleri alanında faaliyet gösterir. Düzenli tedarik programı kurar, tüketim takibini ve planlamayı birlikte yürütürüz.": "Our energy arm works in energy supply and solutions for businesses. We set up a regular supply programme and handle consumption tracking and planning together with the client.",
      "Enerji, üretimi durduran bir belirsizlik olmamalıdır. Bu yüzden tedariki öngörülebilir kılar, verimlilik ve süreklilik odağıyla çalışırız.": "Energy should never be the uncertainty that halts production. That is why we make supply predictable and work with a focus on efficiency and continuity.",
      "İşletmeler için düzenli ve öngörülebilir enerji tedariki.": "Regular, predictable energy supply for businesses.",
      "İhtiyaca göre kurgulanan enerji altyapısı ve planlama.": "Energy infrastructure and planning built around the actual need.",
      "İşletmeler için sözleşmeli, sürekli tedarik programları.": "Contracted, continuous supply programmes for businesses.",
      "Enerji verimliliğine yönelik danışmanlık ve iyileştirme.": "Consultancy and improvement for energy efficiency.",
      "Hizmet kapsamı": "Scope of service",
      "Faaliyet bölgesi": "Area of operation",
      "Enerji tedarik ağı": "Energy supply network",
      "Hizmet verdiğimiz bölgeler, tedarik koşulları ve sözleşmeli enerji seçenekleri hakkında detaylı bilgi için bize ulaşabilirsiniz.": "For details on the regions we serve, supply terms and contracted energy options, please get in touch.",
      "Teklif isteyin": "Request a quote",
      "Saha görselleri": "Site images",
      "Konut ve ticari yapı projeleri, taahhüt işleri ve proje yönetimi.": "Residential and commercial projects, contracting work and project management.",
      "Tedarik programı kuralım.": "Let's set up a supply programme.",
      "Kurumsal enerji ihtiyacınız için bize ulaşın.": "Get in touch about your corporate energy needs.",
      "Hakkımızda — MRD Group": "About — MRD Group",
      "Üç sektör,": "Three sectors,",
      "bir anlayış.": "one approach.",
      "MRD Group; market ve perakende, inşaat ve taahhüt, enerji alanlarında faaliyet gösteren bir gruptur. Her iş kendi alanında bağımsız yürütülür; hepsi aynı kurumsal ölçütle denetlenir.": "MRD Group operates in retail and commerce, construction and contracting, and energy. Each business runs independently in its own field, yet all are held to the same corporate standard.",
      "01 — Kimiz": "01 — Who we are",
      "Farklı işler,": "Different businesses,",
      "tek bir yönetim": "one management",
      "Ticaret, yapı ve enerji ilk bakışta birbirinden uzak alanlar gibi görünür. Bizim için üçü de aynı temele dayanır: gerçekçi planlama, şeffaf yönetim ve verilen sözü tutan bir organizasyon.": "At first glance trade, construction and energy look like distant fields. For us all three rest on the same foundation: realistic planning, transparent management and an organisation that keeps its word.",
      "Grup bünyesindeki her iş, kendi sektörünün gereklerine göre bağımsız yürütülür. Ancak takvim, maliyet ve kalite aynı merkezden aynı ölçütlerle denetlenir. Bir alanda edinilen tecrübe diğerine taşınır; bir projede kurulan tedarik ilişkisi bütün grubun kazancı olur.": "Each business in the group runs independently, according to the demands of its own sector. But schedule, cost and quality are supervised from one centre against the same criteria. Experience gained in one field carries over to another; a supply relationship built on one project becomes a gain for the whole group.",
      "Yatırımlarımızı, bulunduğumuz bölgeye kalıcı değer katacak işler üzerine kuruyoruz. Bir yapının teslim edilmesiyle iş bitmiyor; işletmesi, bakımı ve sürekliliği de bizim sorumluluğumuz.": "We build our investments around work that adds lasting value to the region we are in. Handing over a building does not end the job; its operation, maintenance and continuity are our responsibility too.",
      "hizmete açılan Cizre Park, bölgenin ilk ve tek alışveriş merkezi olarak planlandı. Alışveriş, eğlence ve konut tek bir projede bir araya getirildi; süreç planlamadan teslimata kadar grup bünyesinde yürütüldü.": "Cizre Park was planned as the region's first and only shopping centre. Retail, entertainment and housing were brought together in a single project; the process was carried out within the group from planning to handover.",
      "Gün ışığı alan açık hava konsepti, ulusal seçkin markaları ve geniş ortak alanlarıyla proje, yalnızca bir alışveriş noktası değil; bölge için bir buluşma alanı oldu.": "With its daylight-filled open-air concept, leading national brands and generous shared areas, the project became not merely a place to shop but a meeting place for the region.",
      "Proje alanı": "Project area",
      "Mağaza": "Stores",
      "Konut": "Homes",
      "Sinema salonu": "Cinema screens",
      "Nasıl çalışırız": "How we work",
      "Söz verilen takvim": "The schedule we promise",
      "Bir işi kabul etmeden önce takvimi ve maliyeti gerçekçi hesaplarız. Verilen tarihe uymak, kullanılan malzeme kadar işin parçasıdır.": "Before accepting a job we calculate the schedule and cost realistically. Meeting the date given is as much a part of the work as the materials used.",
      "Tek elden sorumluluk": "Responsibility from a single hand",
      "Projelendirme, saha yönetimi ve teslim aynı ekip tarafından takip edilir. Sorumluluğun bölündüğü yerde hesap sorulamaz.": "Design, site management and handover are followed by the same team. Where responsibility is divided, no one can be held to account.",
      "Teslimden sonrası": "After handover",
      "İşimiz anahtar teslimiyle bitmiyor. İşletme, bakım ve süreklilik de aynı özenle yürütülür.": "Our work does not end at turnkey handover. Operation, maintenance and continuity are carried out with the same care.",
      "Bölgeye kalıcı değer": "Lasting value for the region",
      "Yatırımlarımızı, bulunduğumuz bölgede kalıcı karşılığı olan işler üzerine kuruyoruz.": "We build our investments around work that has a lasting return in the region we are in.",
      "Faaliyet alanlarımız": "Our fields of activity",
      "Üç sektör": "Three sectors",
      "Alışveriş ve perakende": "Shopping and retail",
      "Cizre Park Alışveriş ve Yaşam Merkezi ile alışveriş, market ve günlük yaşam bir arada.": "With Cizre Park Shopping and Living Centre, shopping, retail and everyday life come together.",
      "Konut ve ticari yapı": "Residential and commercial building",
      "Konut projeleri, ticari yapılar ve taahhüt işleri; planlamadan teslime kadar tek elden.": "Residential projects, commercial buildings and contracting work — from planning to handover, from a single hand.",
      "Tedarik ve çözümler": "Supply and solutions",
      "Kurumsal enerji tedariki ve verimlilik çözümleriyle işletmelere destek.": "Supporting businesses with corporate energy supply and efficiency solutions.",
      "Bizi arayın": "Call us",
      "İletişim — MRD Group": "Contact — MRD Group",
      "04 — İletişim": "04 — Contact",
      "Doğrudan": "Reach us",
      "ulaşın.": "directly.",
      "Telefon": "Phone",
      "E-posta": "E-mail",
      "Merkez": "Head office",
      "Çalışma saatleri": "Opening hours",
      "Her gün · 09.00 – 17.00": "Every day · 09:00 – 17:00",
      "Hemen arayın": "Call now",
      "WhatsApp'tan yazın": "Message on WhatsApp",
      "Haritada göster": "Show on map",
      "MRD Group merkez ofis · Harita: © OpenStreetMap": "MRD Group head office · Map: © OpenStreetMap",
      "Hangi konuda görüşmek istiyorsunuz?": "What would you like to talk about?",
      "Cizre Park Alışveriş ve Yaşam Merkezi hakkında bilgi ve talepler.": "Information and enquiries about Cizre Park Shopping and Living Centre.",
      "Proje ve taahhüt": "Projects and contracting",
      "Yeni proje, referans listesi ve yüklenicilik görüşmeleri.": "New projects, reference lists and contracting discussions.",
      "Kurumsal tedarik programı ve teklif talepleri.": "Corporate supply programmes and quote requests.",
      "Sayfa bulunamadı — MRD Group": "Page not found — MRD Group",
      "Aradığınız sayfa bulunamadı": "The page you are looking for was not found",
      "Bağlantı taşınmış veya kaldırılmış olabilir. Ana sayfadan devam edebilirsiniz.": "The link may have moved or been removed. You can continue from the home page.",
      "Ana sayfa": "Home",
      "Giriş": "Intro",
      "Yaklaşım": "Approach",
      "Amiral proje": "Flagship project",
      "Bölüm göstergesi": "Section indicator",
      "Ana menü": "Main menu",
      "MRD Group ana sayfa": "MRD Group home",
      "Menüyü aç": "Open menu",

      "Cizre Park — Alışveriş ve Yaşam Merkezi | MRD Group": "Cizre Park — Shopping and Living Centre | MRD Group",
      "01 — Alışveriş ve yaşam merkezi": "01 — Shopping and living centre",
      "Her şey,": "Everything,",
      "tek çatıda.": "under one roof.",
      "Cizre Park Alışveriş ve Yaşam Merkezi; 2020'den bu yana bölgenin ilk ve tek AVM'si olarak alışverişi, eğlenceyi ve günlük yaşamı açık hava konseptinde bir araya getirir.": "Since 2020 Cizre Park Shopping and Living Centre has been the region's first and only mall, bringing shopping, entertainment and everyday life together in an open-air concept.",
      "Bölgenin ilk ve tek": "The region's first and only",
      "alışveriş ve yaşam merkezi": "shopping and living centre",
      "Cizre Park Alışveriş ve Yaşam Merkezi,": "Cizre Park Shopping and Living Centre",
      "bölgenin ilk ve tek alışveriş merkezi olarak hizmete açıldı. Gün ışığı alan açık hava konsepti, modern mimarisi ve ulusal seçkin markalarıyla alışverişi günlük yaşamla bir araya getirir.": "opened as the region's first and only shopping centre. Its daylight-filled open-air concept, modern architecture and leading national brands bring shopping together with everyday life.",
      "Yaklaşık": "Approximately",
      "alan,": "of space,",
      "26 mağaza": "26 stores",
      "ve": "and",
      "yaşam alanıyla Cizre Park; bölge için bir alışveriş, eğlence ve yaşam noktasıdır.": "of living space make Cizre Park a place to shop, be entertained and live for the region.",
      "Konutluk yaşam alanı": "Homes in the living quarter",
      "Çocuk oyun alanı": "Children's play area",
      "5 salonlu sinema, bowling ve çeşitli eğlence alanları.": "A 5-screen cinema, bowling and various entertainment areas.",
      "Market & alışveriş": "Retail & shopping",
      "Süpermarket ve ulusal seçkin markalarla geniş perakende.": "A supermarket and broad retail with leading national brands.",
      "Zengin lezzet seçenekleriyle ferah yeme-içme alanları.": "Spacious food and drink areas with a wide choice of cuisines.",
      "Aile & çocuk": "Family & children",
      "2.000 m²'lik çocuk oyun alanı ve aileye uygun ortak alanlar.": "A 2,000 m² children's play area and family-friendly shared spaces.",
      "Bir çatı altında her şey": "Everything under one roof",
      "Hizmetler": "Services",
      "5 salonlu sinema": "5-screen cinema",
      "Süpermarket": "Supermarket",
      "Yeme-içme alanları": "Food and drink areas",
      "2.000 m² oyun alanı": "2,000 m² play area",
      "Bowling": "Bowling",
      "Elektrikli araç şarjı": "EV charging",
      "Ücretsiz Wi-Fi": "Free Wi-Fi",
      "Otopark & oto yıkama": "Car park & car wash",
      "Tam erişilebilirlik": "Full accessibility",
      "Mescit & bebek bakım": "Prayer room & baby care",
      "Konum": "Location",
      "Cizre · Şırnak": "Cizre · Şırnak",
      "Konak Mahallesi, Cizre-Silopi Yolu, Cizre / Şırnak — Irak-Silopi, Yeni Şırnak ve Mardin yollarının kesişiminde. Harita yaklaşık konumu gösterir. Harita: © OpenStreetMap.": "Konak District, Cizre–Silopi Road, Cizre / Şırnak — at the junction of the Iraq–Silopi, New Şırnak and Mardin roads. The map shows the approximate location. Map: © OpenStreetMap.",
      "Ziyaret bilgileri": "Visitor information",
      "Gün ışığı alan açık hava konsepti ve ferah alanlarıyla Cizre Park, hafta boyunca ziyaretçilerini ağırlar.": "With its daylight-filled open-air concept and spacious areas, Cizre Park welcomes visitors all week.",
      "Her gün 10.00 – 22.00": "Every day 10:00 – 22:00",
      "Ücretsiz otopark & engelli otopark": "Free parking & accessible parking",
      "Elektrikli araç şarj istasyonu": "EV charging station",
      "Mescit · bebek bakım odası · revir": "Prayer room · baby care room · first aid",
      "İletişime geçin": "Get in touch",
      "Cizre Park'tan": "From Cizre Park",
      "Gerçek görseller": "Real photographs",
      "Cizre Park Alışveriş ve Yaşam Merkezi'nden kareler.": "Shots from Cizre Park Shopping and Living Centre.",
      "Tedarik için görüşelim.": "Let's talk about supply.",
      "İş birliği ve bilgi talepleriniz için bize ulaşın.": "Get in touch with your partnership and information enquiries."
    }
  };

  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };

  /* Çeviri uygulanacak metin düğümlerini bir kez topla ve Türkçe aslını sakla,
     böylece dil değiştirmek her seferinde asıldan çevirir, çeviriden değil. */
  var nodes = null;
  function collect() {
    if (nodes) return nodes;
    nodes = [];
    var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CANVAS: 1 };
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (skip[n.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        return norm(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      /* Türkçe aslı düğümün ÜZERİNDE saklanır. Önbellek tazelendiğinde metin
         o an çevrilmiş olabilir; aslı burada tutmasak onu asıl sanar ve dil
         bir daha geri dönmezdi. */
      if (n.__mrdSource === undefined) n.__mrdSource = n.nodeValue;
      nodes.push({ node: n, tr: n.__mrdSource });
    }
    return nodes;
  }

  /* Metin dışı çevrilecek yerler: sayfa başlığı, açıklama, alt ve aria metinleri */
  var ATTRS = ["alt", "aria-label", "title", "placeholder"];
  var attrNodes = null;
  function collectAttrs() {
    if (attrNodes) return attrNodes;
    attrNodes = [];
    var all = document.querySelectorAll("[alt],[aria-label],[title],[placeholder]");
    for (var i = 0; i < all.length; i++) {
      for (var a = 0; a < ATTRS.length; a++) {
        var el = all[i], name = ATTRS[a];
        var v = el.getAttribute(name);
        if (!v || !norm(v)) continue;
        /* Metin düğümlerindeki ile aynı sebep: aslı elemanın üzerinde sakla. */
        var slot = "__mrdSource_" + name;
        if (el[slot] === undefined) el[slot] = v;
        attrNodes.push({ el: el, attr: name, tr: el[slot] });
      }
    }
    return attrNodes;
  }

  var docTitleTr = document.title;
  var metaDesc = document.querySelector('meta[name="description"]');
  var metaDescTr = metaDesc ? metaDesc.getAttribute("content") : null;

  function translate(lang) {
    var dict = DICT[lang];
    var list = collect();
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!dict) { item.node.nodeValue = item.tr; continue; }
      var hit = dict[norm(item.tr)];
      if (hit === undefined) { item.node.nodeValue = item.tr; continue; }
      /* Baştaki/sondaki boşlukları koru — düzen bozulmasın */
      var lead = item.tr.match(/^\s*/)[0];
      var tail = item.tr.match(/\s*$/)[0];
      item.node.nodeValue = lead + hit + tail;
    }
    var attrs = collectAttrs();
    for (var j = 0; j < attrs.length; j++) {
      var at = attrs[j];
      var av = dict ? dict[norm(at.tr)] : undefined;
      at.el.setAttribute(at.attr, av === undefined ? at.tr : av);
    }
    document.title = (dict && dict[norm(docTitleTr)]) || docTitleTr;
    if (metaDesc && metaDescTr) {
      metaDesc.setAttribute("content", (dict && dict[norm(metaDescTr)]) || metaDescTr);
    }
    document.documentElement.setAttribute("lang", lang);
  }

  function current() {
    try { return localStorage.getItem(STORE) || "tr"; } catch (e) { return "tr"; }
  }
  function remember(lang) {
    try { localStorage.setItem(STORE, lang); } catch (e) { /* gizli sekme */ }
  }

  function buildSwitcher(active) {
    var host = document.querySelector(".site-header__inner");
    if (!host || document.querySelector(".lang")) return;
    var box = document.createElement("div");
    box.className = "lang";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Dil / Language");
    Object.keys(LANGS).forEach(function (code) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang__btn" + (code === active ? " is-active" : "");
      b.textContent = LANGS[code];
      b.setAttribute("lang", code);
      b.addEventListener("click", function () {
        remember(code);
        translate(code);
        var all = box.querySelectorAll(".lang__btn");
        for (var i = 0; i < all.length; i++) all[i].classList.remove("is-active");
        b.classList.add("is-active");
      });
      box.appendChild(b);
    });
    /* Menü düğmesinin soluna: mobilde de erişilebilir kalsın */
    var toggle = host.querySelector(".menu-toggle");
    if (toggle) host.insertBefore(box, toggle); else host.appendChild(box);
  }

  /* Sayfanın bir kısmı (bölüm şeridi gibi) JS ile sonradan kuruluyor. Yeni
     düğümler geldiğinde önbelleği tazeleyip yeniden çeviririz; kendi yazdığımız
     değişiklikleri yeniden tetiklememek için gözlemci o sırada durdurulur. */
  var observer = null;
  function refresh() {
    nodes = null;
    attrNodes = null;
    translate(current());
  }
  function watch() {
    if (!window.MutationObserver) return;
    var timer = null;
    observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        observer.disconnect();
        refresh();
        observer.observe(document.body, { childList: true, subtree: true });
      }, 120);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    var lang = current();
    buildSwitcher(lang);
    if (lang !== "tr") translate(lang);
    watch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
