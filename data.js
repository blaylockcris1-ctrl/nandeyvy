const FX = 7300; // PYG per USD, prototype rate
const LISTINGS = [
  {
    id: "ASU-1842",
    op: "sale", type: "casa", title: "Casa contemporánea en Villa Morra",
    city: "Asunción", barrio: "Villa Morra", dept: "Asunción",
    price: 285000, currency: "USD",
    land: 420, built: 280, beds: 4, baths: 3, parking: 2,
    legal: "Escritura", who: "Ñande Yvy", featured: true,
    img: "h1.jpg",
    desc: "Casa de hormigón y acero con galería perimetral, quincho y jardín. A 4 cuadras de Shopping del Sol.",
    wa: "595981000001"
  },
  {
    id: "LUQ-2201",
    op: "sale", type: "casa", title: "Casa Cora-style en Luque",
    city: "Luque", barrio: "Loma Merlo", dept: "Central",
    price: 168000, currency: "USD",
    land: 360, built: 210, beds: 3, baths: 2, parking: 2,
    legal: "Escritura", who: "Ñande Yvy", featured: true,
    img: "h3.jpg",
    desc: "Vivienda nueva, portón automático y patio posterior. Publicada por el propietario.",
    wa: "595981000002"
  },
  {
    id: "ASU-0911",
    op: "rent", type: "depto", title: "Depto 2 dorm. Las Mercedes",
    city: "Asunción", barrio: "Las Mercedes", dept: "Asunción",
    price: 750, currency: "USD", period: "mes",
    land: 0, built: 86, beds: 2, baths: 2, parking: 1,
    legal: "Contrato", who: "Ñande Yvy", featured: false,
    img: "a1.jpg",
    desc: "Edificio con amenities. Acepta mascotas chicas. Expensas Gs. 850.000.",
    wa: "595981000003"
  },
  {
    id: "CDE-4410",
    op: "sale", type: "lote", title: "Lote 12×30 frente asfaltado — CDE",
    city: "Ciudad del Este", barrio: "Área 4", dept: "Alto Paraná",
    price: 450000000, currency: "PYG",
    land: 360, built: 0, beds: 0, baths: 0, parking: 0,
    legal: "Escritura", who: "Ñande Yvy", featured: true,
    img: "q2.jpg",
    desc: "Lote limpio, servicios en frente. Ideal vivienda o pequeño depósito.",
    wa: "595981000004"
  },
  {
    id: "COR-1188",
    op: "sale", type: "quinta", title: "Quinta El Remanso — Cordillera",
    city: "Altos", barrio: "Ruta Py02", dept: "Cordillera",
    price: 210000, currency: "USD",
    land: 5000, built: 140, beds: 3, baths: 2, parking: 3,
    legal: "Escritura", who: "Ñande Yvy", featured: false,
    img: "q1.jpg",
    desc: "Quinta con monte nativo, pozo y quincho. 55 min de Asunción.",
    wa: "595981000005"
  },
  {
    id: "ENC-0772",
    op: "sale", type: "casa", title: "Casa de hormigón y ladrillo — Encarnación",
    city: "Encarnación", barrio: "San Pedro", dept: "Itapúa",
    price: 145000, currency: "USD",
    land: 300, built: 168, beds: 3, baths: 2, parking: 1,
    legal: "Boleto", who: "Ñande Yvy", featured: false,
    img: "h2.jpg",
    desc: "Cerca de la costanera. Boleto de compraventa al día; escritura en 45 días.",
    wa: "595981000006"
  },
  {
    id: "SAN-3304",
    op: "rent", type: "casa", title: "Casa 3 dorm. San Lorenzo",
    city: "San Lorenzo", barrio: "San Rafael", dept: "Central",
    price: 4500000, currency: "PYG", period: "mes",
    land: 280, built: 150, beds: 3, baths: 2, parking: 1,
    legal: "Contrato", who: "Ñande Yvy", featured: false,
    img: "h3.jpg",
    desc: "Patio y lavadero. No amoblada. Garantía: depósito + fiador.",
    wa: "595981000007"
  },
  {
    id: "ASU-5120",
    op: "sale", type: "depto", title: "Penthouse en pozo — Carmelitas",
    city: "Asunción", barrio: "Carmelitas", dept: "Asunción",
    price: 198000, currency: "USD",
    land: 0, built: 128, beds: 3, baths: 2, parking: 2,
    legal: "En pozo", who: "Ñande Yvy", featured: true,
    img: "a1.jpg",
    desc: "Entrega estimada 2028. Cuotas en dólares. Amenities y 2 cocheras.",
    wa: "595981000008"
  },
  {
    id: "LAM-0902",
    op: "sale", type: "casa", title: "Casa familiar en Lambaré",
    city: "Lambaré", barrio: "San Miguel", dept: "Central",
    price: 125000, currency: "USD",
    land: 320, built: 160, beds: 3, baths: 2, parking: 1,
    legal: "Escritura", who: "Ñande Yvy", featured: false,
    img: "h2.jpg",
    desc: "Casa de un piso, patio y quincho. Cerca de la Costanera de Lambaré.",
    wa: "595981000009"
  },
  {
    id: "CAA-5511",
    op: "sale", type: "lote", title: "Loteamiento 360 m² — Caaguazú",
    city: "Caaguazú", barrio: "Ruta 2", dept: "Caaguazú",
    price: 18000000, currency: "PYG",
    land: 360, built: 0, beds: 0, baths: 0, parking: 0,
    legal: "Boleto", who: "Ñande Yvy", featured: false,
    img: "q2.jpg",
    desc: "Cuota en guaraníes. Energía en frente. Escritura al cancelar.",
    wa: "595981000010"
  }
];
