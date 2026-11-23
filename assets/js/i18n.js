// NeuroUnknown interface translations. Translates navigation, headings, introductions and buttons; scientific content
// (disease pages, gene tables, questions, references) stays in English for accuracy. Translations: AI-drafted, not yet
// reviewed by native-speaker clinicians (stated on the page). Language choice is stored on this device only.
(function () {
  'use strict';
  var LANGS = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', ar: 'العربية', zh: '中文' };
  var NAV = ['Home', 'Our screen', 'Self-disorders', 'Diseases', 'Brain atlas', 'Gene atlas', 'Study', 'Findings', 'Library', 'Reviews', 'Cite & data'];
  var TABS = { home: 'Home', screen: 'Screen', self: 'Self', diseases: 'Diseases', atlas: 'Brain', genome: 'Genes', study: 'Study' };
  var T = {
    de: {
      nav: ['Start', 'Unser Screening', 'Ich-Störungen', 'Krankheiten', 'Gehirnatlas', 'Genatlas', 'Lernen', 'Ergebnisse', 'Bibliothek', 'Reviews', 'Zitieren & Daten'],
      tabs: { home: 'Start', screen: 'Screening', self: 'Ich', diseases: 'Krankheiten', atlas: 'Gehirn', genome: 'Gene', study: 'Lernen' },
      today: 'Heute',
      note: 'Die Benutzeroberfläche ist übersetzt; die wissenschaftlichen Inhalte (Krankheitsseiten, Gentabellen, Fragen) sind derzeit auf Englisch. Übersetzung KI-erstellt, noch nicht fachlich geprüft.',
      hero_eyebrow: 'Offene computergestützte Forschung · aktualisiert Nov. 2026',
      hero_h1: 'Die <em>übersehenen</em> Gene des Gehirns.',
      hero_aside: 'Manche Gene sind eindeutig mit Erkrankungen des Gehirns verbunden, doch kaum jemand hat untersucht, was ihre Proteine tun. Wir finden sie, prüfen sie anhand der Literatur und ordnen sie dem Gehirn zu.',
      big: 'Wir suchen Gene mit <em>starker Verbindung zu Gehirnerkrankungen</em> und <em>fast keiner Forschung</em>. Zu verstehen, was das Protein eines solchen Gens tut, ist der erste Schritt von der Behandlung der Symptome hin zur Behandlung der Ursachen.',
      doors: [['Unser Screening', 'Wie wir alle 19.299 menschlichen proteinkodierenden Gene bewertet und auf einen ersten Kandidaten eingegrenzt haben: das Protein TMEM222, in 3D.'],
              ['Das Selbst bei Schizophrenie', 'Gibt es ein „Zentrum des Ich“? Was bei Ich-Störungen gestört ist, Schritt für Schritt am 3D-Gehirn.'],
              ['Krankheiten & Behandlungen', 'Neurologisch, psychiatrisch und neuroentwicklungsbedingt: Ursachen, Hirnareale, leitliniengerechte Behandlungswege und wo jedes Medikament wirkt.'],
              ['3D-Gehirnatlas', '52 Strukturen und 13 Systeme. Die Substantia nigra einzeln zeigen, das limbische System hervorheben oder die Areale einer Krankheit sehen.'],
              ['Genatlas', 'Jedes Chromosom mit seinen Genen für Gehirnerkrankungen. Chromosom antippen, dann ein Gen: Krankheiten und Folgen seines Verlusts.'],
              ['Lernen: Teste dich', '67 klinische Prüfungsfragen zu Neuroanatomie, Krankheiten, Behandlungen und dem Selbst, jede ausführlich erklärt.']],
      views: {
        screen: ['Das Screening', 'Von allen Genen zu einem ersten Kandidaten', 'Jedes Gen wurde nach drei Fragen bewertet: Ist es ein Gehirnspezialist (N), ist es mit Krankheit verbunden (D), ist es noch ein Rätsel (U)? Dann haben wir Schritt für Schritt eingegrenzt. Tippe auf einen Schritt.'],
        self: ['Ich-Störungen', 'Gibt es ein Zentrum des „Ich“?', 'Menschen mit Schizophrenie können erleben, dass ihre Gedanken eingegeben, ihre Handlungen gesteuert werden oder sie von außen beobachtet werden. Was sagt die Hirnforschung, und was bedeutet das für die Behandlung?'],
        diseases: ['Krankheiten & Behandlungen', 'Krankheiten, Behandlungen und was übersehen wird', 'Wähle eine Gruppe (neurologisch, psychiatrisch, neuroentwicklungsbedingt), dann eine Krankheit: Ursachen, beteiligte Hirnareale, Behandlungsweg nach europäischen und amerikanischen Leitlinien, wo jedes Medikament wirkt, und die Gene, die niemand untersucht. Aussagen sind nummeriert und belegt wie in einem Review.'],
        atlas: ['Gehirnatlas', 'Ein 3D-Gehirn zum Erkunden', '52 Strukturen aus einem MRT-Forschungsatlas: ein Durchschnitt vieler Gehirne im Standardraum (MNI). Wähle eine Struktur, ein ganzes System wie das limbische System oder eine Krankheit. Die Auswahl leuchtet farbig, alles andere wird durchsichtig. Auch als axiale, koronare und sagittale Schnitte.'],
        genome: ['Genatlas', 'Jedes Gen an seinem Platz', 'Deine DNA ist in 23 Chromosomenpaare verpackt. Jedes Chromosom trägt Hunderte bis Tausende Gene, die Baupläne für Proteine. Wähle ein Chromosom, um seine Gene für Gehirnerkrankungen zu sehen, und dann ein Gen.'],
        study: ['Lernen', 'Teste dich selbst', 'Klinische Fallfragen im Stil medizinischer Staatsexamina (z. B. USMLE), für diese Seite geschrieben. Wähle ein Thema, antworte und bestätige: Jede Option wird erklärt. Die Fragen selbst sind auf Englisch.']
      }
    },
    fr: {
      nav: ['Accueil', 'Notre criblage', 'Troubles du soi', 'Maladies', 'Atlas du cerveau', 'Atlas des gènes', 'Étudier', 'Résultats', 'Bibliothèque', 'Revues', 'Citer & données'],
      tabs: { home: 'Accueil', screen: 'Criblage', self: 'Soi', diseases: 'Maladies', atlas: 'Cerveau', genome: 'Gènes', study: 'Étudier' },
      today: "Aujourd'hui",
      note: "L'interface est traduite ; le contenu scientifique (pages des maladies, tableaux de gènes, questions) est pour l'instant en anglais. Traduction rédigée par IA, pas encore relue par des spécialistes.",
      hero_eyebrow: 'Recherche computationnelle ouverte · mise à jour nov. 2026',
      hero_h1: 'Les gènes <em>négligés</em> du cerveau.',
      hero_aside: "Certains gènes sont clairement liés aux maladies du cerveau, mais presque personne n'a étudié ce que font leurs protéines. Nous les identifions, les vérifions dans la littérature et les situons dans le cerveau.",
      big: "Nous cherchons des gènes <em>fortement liés aux maladies du cerveau</em> et <em>presque pas étudiés</em>. Comprendre ce que fait la protéine d'un tel gène est le premier pas pour passer du traitement des symptômes au traitement des causes.",
      doors: [['Notre criblage', 'Comment nous avons évalué les 19 299 gènes humains codant des protéines pour retenir un premier candidat : la protéine TMEM222, en 3D.'],
              ['Le soi dans la schizophrénie', 'Existe-t-il un « centre du moi » ? Ce qui se dérègle dans les troubles du soi, étape par étape sur le cerveau en 3D.'],
              ['Maladies & traitements', 'Neurologiques, psychiatriques et neurodéveloppementales : causes, régions cérébrales, parcours de soins selon les recommandations et lieu d’action de chaque médicament.'],
              ['Atlas du cerveau en 3D', '52 structures et 13 systèmes. Isoler la substance noire, éclairer le système limbique ou voir les régions d’une maladie.'],
              ['Atlas des gènes', 'Chaque chromosome et ses gènes liés aux maladies du cerveau. Touchez un chromosome, puis un gène.'],
              ['Étudier : testez-vous', '67 questions cliniques de type examen sur la neuroanatomie, les maladies, leurs traitements et le soi, chacune expliquée.']],
      views: {
        screen: ['Le criblage', "De tous les gènes à un premier candidat", "Chaque gène a été évalué selon trois questions : est-il spécialiste du cerveau (N), est-il lié à une maladie (D), reste-t-il un mystère (U) ? Puis nous avons affiné étape par étape. Touchez une étape."],
        self: ['Troubles du soi', 'Existe-t-il un centre du « moi » ?', "Les personnes atteintes de schizophrénie peuvent sentir que leurs pensées sont imposées, leurs actes contrôlés ou qu'elles sont observées de l'extérieur. Que dit la recherche sur le cerveau, et qu'est-ce que cela signifie pour le traitement ?"],
        diseases: ['Maladies & traitements', 'Maladies, traitements et ce qui est négligé', "Choisissez un groupe (neurologique, psychiatrique ou neurodéveloppemental), puis une maladie : causes, régions cérébrales, parcours de traitement selon les recommandations européennes et américaines, lieu d'action de chaque médicament et gènes peu étudiés. Les affirmations sont numérotées et référencées."],
        atlas: ['Atlas du cerveau', 'Un cerveau en 3D à explorer', "52 structures issues d'un atlas IRM de recherche : la moyenne de nombreux cerveaux dans l'espace standard (MNI). Choisissez une structure, un système comme le système limbique, ou une maladie. La sélection s'éclaire, le reste devient transparent. Aussi en coupes axiales, coronales et sagittales."],
        genome: ['Atlas des gènes', 'Chaque gène à sa place', "Votre ADN est réparti en 23 paires de chromosomes, chacun portant des centaines à des milliers de gènes, les recettes des protéines. Choisissez un chromosome pour voir ses gènes liés aux maladies du cerveau, puis un gène."],
        study: ['Étudier', 'Testez-vous', "Questions cliniques dans le style des examens de médecine (comme l'USMLE), écrites pour ce site. Choisissez un thème, répondez et confirmez : chaque option est expliquée. Les questions sont en anglais."]
      }
    },
    es: {
      nav: ['Inicio', 'Nuestro cribado', 'Trastornos del yo', 'Enfermedades', 'Atlas cerebral', 'Atlas de genes', 'Estudiar', 'Resultados', 'Biblioteca', 'Revisiones', 'Citar y datos'],
      tabs: { home: 'Inicio', screen: 'Cribado', self: 'Yo', diseases: 'Enfermed.', atlas: 'Cerebro', genome: 'Genes', study: 'Estudiar' },
      today: 'Hoy',
      note: 'La interfaz está traducida; el contenido científico (páginas de enfermedades, tablas de genes, preguntas) está por ahora en inglés. Traducción hecha con IA, aún no revisada por especialistas.',
      hero_eyebrow: 'Investigación computacional abierta · actualizado nov. 2026',
      hero_h1: 'Los genes <em>olvidados</em> del cerebro.',
      hero_aside: 'Algunos genes están claramente ligados a enfermedades del cerebro, pero casi nadie ha estudiado qué hacen sus proteínas. Los encontramos, los contrastamos con la literatura y los situamos en el cerebro.',
      big: 'Buscamos genes con <em>fuerte relación con enfermedades del cerebro</em> y <em>casi ninguna investigación</em>. Entender qué hace la proteína de ese gen es el primer paso para pasar de tratar síntomas a tratar causas.',
      doors: [['Nuestro cribado', 'Cómo puntuamos los 19.299 genes humanos que codifican proteínas hasta elegir un primer candidato: la proteína TMEM222, en 3D.'],
              ['El yo en la esquizofrenia', '¿Existe un «centro del yo»? Qué falla en los trastornos del yo, paso a paso sobre el cerebro en 3D.'],
              ['Enfermedades y tratamientos', 'Neurológicas, psiquiátricas y del neurodesarrollo: causas, áreas cerebrales, pautas de tratamiento según guías y dónde actúa cada fármaco.'],
              ['Atlas cerebral 3D', '52 estructuras y 13 sistemas. Aislar la sustancia negra, iluminar el sistema límbico o ver las áreas de una enfermedad.'],
              ['Atlas de genes', 'Cada cromosoma con sus genes ligados a enfermedades cerebrales. Toca un cromosoma y luego un gen.'],
              ['Estudiar: ponte a prueba', '67 preguntas clínicas tipo examen sobre neuroanatomía, enfermedades, tratamientos y el yo, todas explicadas.']],
      views: {
        screen: ['El cribado', 'De todos los genes a un primer candidato', 'Cada gen se puntuó con tres preguntas: ¿es especialista del cerebro (N), está ligado a enfermedad (D), sigue siendo un misterio (U)? Luego filtramos paso a paso. Toca un paso.'],
        self: ['Trastornos del yo', '¿Existe un centro del «yo»?', 'Las personas con esquizofrenia pueden sentir que sus pensamientos son impuestos, sus actos controlados o que son observadas desde fuera. ¿Qué dice la investigación cerebral y qué significa para el tratamiento?'],
        diseases: ['Enfermedades y tratamientos', 'Enfermedades, tratamientos y lo que se pasa por alto', 'Elige un grupo (neurológico, psiquiátrico o del neurodesarrollo) y luego una enfermedad: causas, áreas cerebrales, pauta de tratamiento según guías europeas y americanas, dónde actúa cada fármaco y los genes poco estudiados. Las afirmaciones están numeradas y referenciadas.'],
        atlas: ['Atlas cerebral', 'Un cerebro 3D para explorar', '52 estructuras de un atlas de resonancia de investigación: la media de muchos cerebros en espacio estándar (MNI). Elige una estructura, un sistema como el límbico o una enfermedad. Lo elegido se ilumina y el resto se vuelve transparente. También en cortes axiales, coronales y sagitales.'],
        genome: ['Atlas de genes', 'Cada gen en su lugar', 'Tu ADN está empaquetado en 23 pares de cromosomas, cada uno con cientos o miles de genes, las recetas de las proteínas. Elige un cromosoma para ver sus genes ligados a enfermedades cerebrales y luego un gen.'],
        study: ['Estudiar', 'Ponte a prueba', 'Preguntas de casos clínicos al estilo de los exámenes médicos (como el USMLE), escritas para este sitio. Elige un tema, responde y confirma: cada opción se explica. Las preguntas están en inglés.']
      }
    },
    it: {
      nav: ['Home', 'Il nostro screening', 'Disturbi del sé', 'Malattie', 'Atlante del cervello', 'Atlante dei geni', 'Studia', 'Risultati', 'Biblioteca', 'Revisioni', 'Cita & dati'],
      tabs: { home: 'Home', screen: 'Screening', self: 'Sé', diseases: 'Malattie', atlas: 'Cervello', genome: 'Geni', study: 'Studia' },
      today: 'Oggi',
      note: "L'interfaccia è tradotta; i contenuti scientifici (pagine delle malattie, tabelle dei geni, domande) sono per ora in inglese. Traduzione redatta con IA, non ancora revisionata da specialisti.",
      hero_eyebrow: 'Ricerca computazionale aperta · aggiornato nov. 2026',
      hero_h1: 'I geni <em>trascurati</em> del cervello.',
      hero_aside: 'Alcuni geni sono chiaramente legati alle malattie del cervello, eppure quasi nessuno ha studiato cosa fanno le loro proteine. Li troviamo, li verifichiamo nella letteratura e li collochiamo nel cervello.',
      big: 'Cerchiamo geni <em>fortemente legati alle malattie del cervello</em> e <em>quasi mai studiati</em>. Capire cosa fa la proteina di un tale gene è il primo passo per passare dalla cura dei sintomi alla cura delle cause.',
      doors: [['Il nostro screening', 'Come abbiamo valutato tutti i 19.299 geni umani codificanti proteine fino a un primo candidato: la proteina TMEM222, in 3D.'],
              ['Il sé nella schizofrenia', 'Esiste un «centro dell’io»? Cosa si altera nei disturbi del sé, passo dopo passo sul cervello in 3D.'],
              ['Malattie & terapie', 'Neurologiche, psichiatriche e del neurosviluppo: cause, aree cerebrali, percorsi di cura secondo le linee guida e dove agisce ogni farmaco.'],
              ['Atlante 3D del cervello', '52 strutture e 13 sistemi. Isolare la sostanza nera, illuminare il sistema limbico o vedere le aree di una malattia.'],
              ['Atlante dei geni', 'Ogni cromosoma con i suoi geni legati alle malattie del cervello. Tocca un cromosoma, poi un gene.'],
              ['Studia: mettiti alla prova', '67 domande cliniche in stile esame su neuroanatomia, malattie, terapie e sé, ognuna spiegata.']],
      views: {
        screen: ['Lo screening', 'Da tutti i geni a un primo candidato', "Ogni gene è stato valutato con tre domande: è uno specialista del cervello (N), è legato a malattie (D), è ancora un mistero (U)? Poi abbiamo ristretto passo dopo passo. Tocca un passaggio."],
        self: ['Disturbi del sé', 'Esiste un centro dell’«io»?', 'Le persone con schizofrenia possono sentire che i loro pensieri sono inseriti, le loro azioni controllate o di essere osservate dall’esterno. Cosa dice la ricerca sul cervello e cosa significa per la terapia?'],
        diseases: ['Malattie & terapie', 'Malattie, terapie e ciò che viene trascurato', 'Scegli un gruppo (neurologico, psichiatrico o del neurosviluppo), poi una malattia: cause, aree cerebrali, percorso terapeutico secondo le linee guida europee e americane, dove agisce ogni farmaco e i geni poco studiati. Le affermazioni sono numerate e citate.'],
        atlas: ['Atlante del cervello', 'Un cervello 3D da esplorare', '52 strutture da un atlante di risonanza per la ricerca: la media di molti cervelli nello spazio standard (MNI). Scegli una struttura, un sistema come il limbico o una malattia. La selezione si illumina, il resto diventa trasparente. Anche in sezioni assiali, coronali e sagittali.'],
        genome: ['Atlante dei geni', 'Ogni gene al suo posto', 'Il tuo DNA è racchiuso in 23 coppie di cromosomi, ognuno con centinaia o migliaia di geni, le ricette delle proteine. Scegli un cromosoma per vedere i suoi geni legati alle malattie del cervello, poi un gene.'],
        study: ['Studia', 'Mettiti alla prova', 'Domande su casi clinici nello stile degli esami di medicina (come l’USMLE), scritte per questo sito. Scegli un argomento, rispondi e conferma: ogni opzione è spiegata. Le domande sono in inglese.']
      }
    },
    ar: {
      nav: ['الرئيسية', 'فحصنا الجيني', 'اضطرابات الذات', 'الأمراض', 'أطلس الدماغ', 'أطلس الجينات', 'الدراسة', 'النتائج', 'المكتبة', 'المراجعات', 'الاستشهاد والبيانات'],
      tabs: { home: 'الرئيسية', screen: 'الفحص', self: 'الذات', diseases: 'الأمراض', atlas: 'الدماغ', genome: 'الجينات', study: 'الدراسة' },
      today: 'اليوم',
      note: 'تمت ترجمة الواجهة؛ أما المحتوى العلمي (صفحات الأمراض وجداول الجينات والأسئلة) فهو حاليًا بالإنجليزية. الترجمة مُعدّة بالذكاء الاصطناعي ولم يراجعها مختصون بعد.',
      hero_eyebrow: 'بحث حاسوبي مفتوح · تحديث نوفمبر 2026',
      hero_h1: 'الجينات <em>المُهمَلة</em> في الدماغ.',
      hero_aside: 'بعض الجينات مرتبطة بوضوح بأمراض الدماغ، ومع ذلك لم يدرس أحد تقريبًا ما تفعله بروتيناتها. نحن نجدها ونتحقق منها في الأدبيات العلمية ونحدد موقعها في الدماغ.',
      big: 'نبحث عن جينات <em>مرتبطة بقوة بأمراض الدماغ</em> و<em>شبه غائبة عن الأبحاث</em>. إن فهم ما يفعله بروتين هذا الجين هو الخطوة الأولى من علاج الأعراض نحو علاج الأسباب.',
      doors: [['فحصنا الجيني', 'كيف قيّمنا جميع الجينات البشرية المشفِّرة للبروتين وعددها 19,299 حتى وصلنا إلى أول مرشح: بروتين TMEM222 بالأبعاد الثلاثية.'],
              ['الذات في الفصام', 'هل يوجد «مركز للأنا»؟ ما الذي يختل في اضطرابات الذات، خطوة بخطوة على دماغ ثلاثي الأبعاد.'],
              ['الأمراض والعلاجات', 'عصبية ونفسية ونمائية عصبية: الأسباب، مناطق الدماغ، مسارات العلاج وفق الإرشادات، وأين يعمل كل دواء.'],
              ['أطلس الدماغ ثلاثي الأبعاد', '52 بنية و13 جهازًا. اعزل المادة السوداء، أو أبرز الجهاز الحوفي، أو شاهد مناطق مرض ما.'],
              ['أطلس الجينات', 'كل كروموسوم وجيناته المرتبطة بأمراض الدماغ. اضغط على كروموسوم ثم على جين.'],
              ['الدراسة: اختبر نفسك', '67 سؤالًا سريريًا بأسلوب الامتحانات عن التشريح العصبي والأمراض وعلاجاتها والذات، مع شرح كامل لكل سؤال.']],
      views: {
        screen: ['الفحص الجيني', 'من كل الجينات إلى مرشح أول', 'قُيِّم كل جين بثلاثة أسئلة: هل هو متخصص في الدماغ (N)، هل يرتبط بالمرض (D)، هل ما زال لغزًا (U)؟ ثم ضيّقنا الاختيار خطوة بخطوة. اضغط على خطوة.'],
        self: ['اضطرابات الذات', 'هل يوجد مركز لـ«الأنا»؟', 'قد يشعر المصابون بالفصام بأن أفكارهم مُدخَلة، أو أن أفعالهم مُسيطَر عليها، أو أنهم مراقَبون من الخارج. ماذا تقول أبحاث الدماغ، وماذا يعني ذلك للعلاج؟'],
        diseases: ['الأمراض والعلاجات', 'الأمراض والعلاجات وما يُهمَل', 'اختر مجموعة (عصبية أو نفسية أو نمائية عصبية) ثم مرضًا: الأسباب، ومناطق الدماغ، ومسار العلاج وفق الإرشادات الأوروبية والأمريكية، وأين يعمل كل دواء، والجينات التي لا يدرسها أحد. العبارات مرقّمة ومُوثّقة كما في مقالة مراجعة.'],
        atlas: ['أطلس الدماغ', 'دماغ ثلاثي الأبعاد للاستكشاف', '52 بنية مأخوذة من أطلس رنين مغناطيسي بحثي: متوسط أدمغة كثيرة في الفضاء القياسي (MNI). اختر بنية، أو جهازًا كاملًا مثل الجهاز الحوفي، أو مرضًا. يُضاء ما تختاره بالألوان ويصبح الباقي شفافًا. ويتوفر أيضًا بمقاطع محورية وإكليلية وسهمية.'],
        genome: ['أطلس الجينات', 'كل جين في مكانه', 'حمضك النووي معبأ في 23 زوجًا من الكروموسومات، يحمل كل منها مئات إلى آلاف الجينات، وهي وصفات صنع البروتينات. اختر كروموسومًا لترى جيناته المرتبطة بأمراض الدماغ، ثم اختر جينًا.'],
        study: ['الدراسة', 'اختبر نفسك', 'أسئلة حالات سريرية بأسلوب امتحانات الترخيص الطبي (مثل USMLE)، كُتبت لهذا الموقع. اختر موضوعًا، وأجب، ثم أكّد: يُشرح كل خيار. الأسئلة نفسها بالإنجليزية.']
      }
    },
    zh: {
      nav: ['首页', '我们的筛选', '自我障碍', '疾病', '大脑图谱', '基因图谱', '学习', '研究发现', '资料库', '综述', '引用与数据'],
      tabs: { home: '首页', screen: '筛选', self: '自我', diseases: '疾病', atlas: '大脑', genome: '基因', study: '学习' },
      today: '今日',
      note: '界面已翻译；科学内容（疾病页面、基因表格、题目）目前为英文。译文由人工智能生成，尚未经专业人员审校。',
      hero_eyebrow: '开放的计算研究 · 2026年11月更新',
      hero_h1: '大脑中<em>被忽视</em>的基因。',
      hero_aside: '有些基因与脑部疾病明确相关，却几乎没有人研究它们编码的蛋白质有什么功能。我们找出这些基因，对照文献加以核查，并将它们定位到大脑中。',
      big: '我们寻找<em>与脑部疾病密切相关</em>却<em>几乎无人研究</em>的基因。了解这类基因的蛋白质作用，是从治疗症状走向治疗病因的第一步。',
      doors: [['我们的筛选', '我们如何评估全部 19,299 个人类蛋白编码基因，并缩小到第一个候选：TMEM222 蛋白（3D 展示）。'],
              ['精神分裂症中的自我', '存在“自我中枢”吗？在三维大脑上一步步了解自我障碍中出了什么问题。'],
              ['疾病与治疗', '神经系统、精神科与神经发育疾病：病因、相关脑区、指南推荐的治疗路径，以及每种药物的作用部位。'],
              ['三维大脑图谱', '52 个结构和 13 个系统。单独显示黑质、点亮边缘系统，或查看某种疾病涉及的脑区。'],
              ['基因图谱', '每条染色体及其与脑部疾病相关的基因。点击染色体，再点击基因。'],
              ['学习：自我测试', '67 道考试风格的临床题，涵盖神经解剖、疾病、治疗与自我，每题均有详细解析。']],
      views: {
        screen: ['筛选', '从所有基因到第一个候选', '每个基因按三个问题评分：它是否为大脑特异（N）？是否与疾病相关（D）？是否仍是未解之谜（U）？然后逐步缩小范围。点击某一步查看说明。'],
        self: ['自我障碍', '存在“我”的中枢吗？', '精神分裂症患者可能感到自己的思想被插入、行为被控制，或正被外界观察。脑科学研究怎么说？这对治疗意味着什么？'],
        diseases: ['疾病与治疗', '疾病、治疗以及被忽视的部分', '先选择类别（神经系统、精神科或神经发育），再选择疾病：病因、相关脑区、依据欧美指南的治疗路径、每种药物的作用部位，以及无人研究的基因。所有陈述均按综述论文方式编号并附参考文献。'],
        atlas: ['大脑图谱', '可探索的三维大脑', '52 个结构来自研究用 MRI 图谱：标准空间（MNI）中多人大脑的平均。选择一个结构、一个完整系统（如边缘系统）或一种疾病，所选部分以彩色显示，其余变为透明。也可查看轴位、冠状位和矢状位切面。'],
        genome: ['基因图谱', '每个基因各就其位', '你的 DNA 分装在 23 对染色体中，每条染色体携带数百到数千个基因，即制造蛋白质的“配方”。选择一条染色体，查看其中与脑部疾病相关的基因，再选择一个基因。'],
        study: ['学习', '自我测试', '仿照医学执照考试（如 USMLE）风格、为本网站编写的临床病例题。选择主题、作答并确认：每个选项都有解析。题目本身为英文。']
      }
    }
  };
  var ORIG = null;
  function grab() {
    ORIG = { html: new Map() };
    document.querySelectorAll('[data-i18n-k]').forEach(function (el) { ORIG.html.set(el, el.innerHTML); });
  }
  function q(sel) { return document.querySelector(sel); }
  function mark() { // tag translatable elements once
    function tag(el, k) { if (el && !el.dataset.i18nK) el.dataset.i18nK = k; }
    document.querySelectorAll('header.site nav.mainnav a').forEach(function (a) { var i = NAV.indexOf(a.dataset.nav); if (i >= 0) tag(a, 'nav.' + i); });
    document.querySelectorAll('#tabbar a').forEach(function (a) { tag(a.lastChild && a.lastChild.nodeType === 3 ? a : null, 'tab.' + a.dataset.tab); });
    tag(q('.ticker .tk-live'), 'today');
    tag(q('[data-view=home] .hero .eyebrow'), 'hero_eyebrow'); tag(q('[data-view=home] h1.display'), 'hero_h1');
    tag(q('[data-view=home] .hero-aside'), 'hero_aside'); tag(q('[data-view=home] .mission .big'), 'big');
    document.querySelectorAll('.doors .door').forEach(function (d, i) { tag(d.querySelector('h3'), 'door.' + i + '.0'); tag(d.querySelector('p'), 'door.' + i + '.1'); });
    ['screen', 'self', 'diseases', 'atlas', 'genome', 'study'].forEach(function (v) {
      var s = q('[data-view=' + v + ']'); if (!s) return;
      tag(s.querySelector('.vhead .eyebrow'), 'view.' + v + '.0'); tag(s.querySelector('.vhead h2.title'), 'view.' + v + '.1'); tag(s.querySelector('.vhead .lede'), 'view.' + v + '.2');
    });
  }
  function value(L, k) {
    var p = k.split('.');
    if (p[0] === 'nav') return L.nav[+p[1]];
    if (p[0] === 'tab') return L.tabs[p[1]];
    if (p[0] === 'door') return L.doors[+p[1]] && L.doors[+p[1]][+p[2]];
    if (p[0] === 'view') return L.views[p[1]] && L.views[p[1]][+p[2]];
    return L[k];
  }
  function apply(lang) {
    if (!ORIG) { mark(); grab(); }
    var L = T[lang], r = document.documentElement;
    r.lang = lang === 'zh' ? 'zh-Hans' : lang; r.dir = lang === 'ar' ? 'rtl' : 'ltr';
    ORIG.html.forEach(function (orig, el) {
      var k = el.dataset.i18nK, v = L ? value(L, k) : null;
      if (!v) { el.innerHTML = orig; return; }
      if (k.indexOf('tab.') === 0) { el.lastChild.nodeValue = v; return; }
      if (/\.0$/.test(k) && k.indexOf('view.') === 0) { var b = el.querySelector('b'); el.innerHTML = (b ? b.outerHTML + ' ' : '') + v; return; }
      if (k === 'hero_eyebrow') { var b2 = el.querySelector('b'); el.innerHTML = (b2 ? b2.outerHTML + ' ' : '') + v; return; }
      el.innerHTML = v;
    });
    var n = document.getElementById('i18nNote');
    if (!n) { n = document.createElement('div'); n.id = 'i18nNote'; n.className = 'i18n-note'; var m = document.querySelector('main') || document.body; m.insertBefore(n, m.firstChild); }
    n.textContent = L ? L.note : ''; n.hidden = !L;
    var sel = document.getElementById('langSel'); if (sel) sel.value = lang;
    try { localStorage.setItem('nu-lang', lang); } catch (e) {}
  }
  function init() {
    var tools = document.querySelector('header.site .hdr-tools');
    if (tools && !document.getElementById('langSel')) {
      var s = document.createElement('select'); s.id = 'langSel'; s.className = 'lang-sel'; s.setAttribute('aria-label', 'Language');
      Object.keys(LANGS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = LANGS[k]; s.appendChild(o); });
      s.addEventListener('change', function () { apply(s.value); });
      tools.insertBefore(s, tools.firstChild);
    }
    var lang = 'en'; try { lang = localStorage.getItem('nu-lang') || 'en'; } catch (e) {}
    if (!T[lang] && lang !== 'en') lang = 'en';
    if (lang !== 'en') apply(lang); else { var sel = document.getElementById('langSel'); if (sel) sel.value = 'en'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
