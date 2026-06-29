// public/js/data/foodTable.js
// Tabella nutrizionale per alimenti senza barcode, basata su:
// "Tabelle di Composizione degli Alimenti" CREA (già INN-INRAN), edizione aggiornata.
// Valori per 100g di parte edibile, alimento crudo salvo dove indicato.
// Struttura: { nome, aliases, categoria, calorie100, proteine100, carbo100, grassi100 }

export const foodTable = [

    // ─── CARNI BIANCHE ──────────────────────────────────────────────────────────
    {
        nome: 'Petto di pollo',
        aliases: ['pollo petto', 'petto pollo', 'fettine di pollo', 'scaloppine di pollo', 'pollo crudo'],
        categoria: 'Proteina',
        calorie100: 108, proteine100: 23.3, carbo100: 0, grassi100: 1.2
    },
    {
        nome: 'Coscia di pollo',
        aliases: ['cosce di pollo', 'pollo coscia', 'pollo con osso'],
        categoria: 'Proteina',
        calorie100: 118, proteine100: 19.4, carbo100: 0, grassi100: 4.3
    },
    {
        nome: 'Pollo intero',
        aliases: ['pollo arrosto', 'pollo al forno'],
        categoria: 'Proteina',
        calorie100: 129, proteine100: 20.0, carbo100: 0, grassi100: 5.6
    },
    {
        nome: 'Petto di tacchino',
        aliases: ['tacchino petto', 'fesa di tacchino', 'fettine di tacchino', 'tacchino crudo'],
        categoria: 'Proteina',
        calorie100: 101, proteine100: 23.6, carbo100: 0, grassi100: 0.6
    },
    {
        nome: 'Fesa di vitello',
        aliases: ['vitello fesa', 'scaloppine di vitello', 'fettine di vitello'],
        categoria: 'Proteina',
        calorie100: 101, proteine100: 21.3, carbo100: 0, grassi100: 1.5
    },

    // ─── CARNI ROSSE ────────────────────────────────────────────────────────────
    {
        nome: 'Manzo (fettine)',
        aliases: ['fettine di manzo', 'scamone', 'fesa di manzo', 'bistecca di manzo', 'manzo magro', 'carne bovina'],
        categoria: 'Proteina',
        calorie100: 131, proteine100: 21.0, carbo100: 0, grassi100: 5.2
    },
    {
        nome: 'Manzo macinato',
        aliases: ['carne macinata', 'macinato di manzo', 'trito di manzo'],
        categoria: 'Proteina',
        calorie100: 234, proteine100: 17.9, carbo100: 0, grassi100: 18.0
    },
    {
        nome: 'Bistecca di manzo (magra)',
        aliases: ['controfiletto', 'filetto di manzo', 'roastbeef'],
        categoria: 'Proteina',
        calorie100: 158, proteine100: 22.0, carbo100: 0, grassi100: 7.5
    },
    {
        nome: 'Lonza di maiale',
        aliases: ['maiale lonza', 'lombo di maiale', 'fettine di maiale', 'braciola di maiale'],
        categoria: 'Proteina',
        calorie100: 109, proteine100: 22.0, carbo100: 0, grassi100: 2.7
    },
    {
        nome: 'Maiale (coscia)',
        aliases: ['fesa di maiale', 'prosciutto fresco', 'maiale magro'],
        categoria: 'Proteina',
        calorie100: 133, proteine100: 21.0, carbo100: 0, grassi100: 5.5
    },
    {
        nome: 'Agnello (coscia)',
        aliases: ['coscio di agnello', 'agnello magro'],
        categoria: 'Proteina',
        calorie100: 131, proteine100: 19.0, carbo100: 0, grassi100: 6.0
    },

    // ─── AFFETTATI ───────────────────────────────────────────────────────────────
    {
        nome: 'Bresaola',
        aliases: ['bresaola della valtellina'],
        categoria: 'Proteina',
        calorie100: 175, proteine100: 32.0, carbo100: 0.5, grassi100: 5.0
    },
    {
        nome: 'Prosciutto crudo',
        aliases: ['crudo', 'prosciutto di parma', 'prosciutto di san daniele'],
        categoria: 'Proteina',
        calorie100: 285, proteine100: 25.9, carbo100: 0, grassi100: 20.1
    },
    {
        nome: 'Prosciutto cotto',
        aliases: ['cotto', 'prosciutto cotto alta qualità'],
        categoria: 'Proteina',
        calorie100: 204, proteine100: 19.9, carbo100: 0, grassi100: 13.8
    },
    {
        nome: 'Mortadella',
        aliases: ['mortadella bologna'],
        categoria: 'Proteina',
        calorie100: 311, proteine100: 14.7, carbo100: 1.5, grassi100: 27.7
    },
    {
        nome: 'Speck',
        aliases: ['speck dell alto adige'],
        categoria: 'Proteina',
        calorie100: 290, proteine100: 28.0, carbo100: 0, grassi100: 20.0
    },
    {
        nome: 'Salame Milano',
        aliases: ['salame', 'salame tipo milano'],
        categoria: 'Proteina',
        calorie100: 457, proteine100: 25.4, carbo100: 0, grassi100: 39.1
    },
    {
        nome: 'Coppa (capocollo)',
        aliases: ['coppa', 'capocollo'],
        categoria: 'Proteina',
        calorie100: 330, proteine100: 21.0, carbo100: 0, grassi100: 27.0
    },
    {
        nome: 'Pancetta',
        aliases: ['pancetta tesa', 'pancetta arrotolata'],
        categoria: 'Proteina',
        calorie100: 460, proteine100: 14.0, carbo100: 0, grassi100: 44.0
    },
    {
        nome: 'Pollo affettato',
        aliases: ['fettine di pollo affettato', 'petto di pollo affettato', 'pollo in busta'],
        categoria: 'Proteina',
        calorie100: 105, proteine100: 20.5, carbo100: 2.0, grassi100: 2.0
    },
    {
        nome: 'Tacchino affettato',
        aliases: ['fettine di tacchino affettato', 'petto di tacchino affettato', 'tacchino in busta'],
        categoria: 'Proteina',
        calorie100: 100, proteine100: 20.0, carbo100: 2.0, grassi100: 1.5
    },

    // ─── PESCE ───────────────────────────────────────────────────────────────────
    {
        nome: 'Merluzzo',
        aliases: ['nasello', 'filetto di merluzzo', 'baccalà fresco'],
        categoria: 'Proteina',
        calorie100: 74, proteine100: 16.7, carbo100: 0, grassi100: 0.7
    },
    {
        nome: 'Salmone fresco',
        aliases: ['filetto di salmone', 'salmone atlantico'],
        categoria: 'Proteina',
        calorie100: 185, proteine100: 18.4, carbo100: 0, grassi100: 12.0
    },
    {
        nome: 'Tonno fresco',
        aliases: ['filetto di tonno', 'tonno pinna gialla'],
        categoria: 'Proteina',
        calorie100: 177, proteine100: 21.5, carbo100: 0, grassi100: 10.0
    },
    {
        nome: 'Tonno al naturale',
        aliases: ['tonno in scatola', 'tonno in acqua', 'tonno sgocciolato'],
        categoria: 'Proteina',
        calorie100: 120, proteine100: 25.4, carbo100: 0, grassi100: 2.0
    },
    {
        nome: 'Branzino',
        aliases: ['spigola', 'filetto di branzino', 'filetto di spigola'],
        categoria: 'Proteina',
        calorie100: 82, proteine100: 16.8, carbo100: 0, grassi100: 1.7
    },
    {
        nome: 'Orata',
        aliases: ['filetto di orata'],
        categoria: 'Proteina',
        calorie100: 100, proteine100: 17.6, carbo100: 0, grassi100: 3.5
    },
    {
        nome: 'Sgombro',
        aliases: ['mackerel', 'filetto di sgombro'],
        categoria: 'Proteina',
        calorie100: 170, proteine100: 17.0, carbo100: 0, grassi100: 11.0
    },
    {
        nome: 'Gamberi',
        aliases: ['gamberetti', 'code di gambero', 'mazzancolle'],
        categoria: 'Proteina',
        calorie100: 85, proteine100: 18.0, carbo100: 0, grassi100: 1.5
    },
    {
        nome: 'Trota',
        aliases: ['filetto di trota', 'trota iridea'],
        categoria: 'Proteina',
        calorie100: 104, proteine100: 18.5, carbo100: 0, grassi100: 3.4
    },

    // ─── UOVA ────────────────────────────────────────────────────────────────────
    {
        nome: 'Uovo intero',
        aliases: ['uova', 'uovo di gallina'],
        categoria: 'Proteina',
        calorie100: 128, proteine100: 12.4, carbo100: 0.5, grassi100: 8.7
    },
    {
        nome: 'Albume d\'uovo',
        aliases: ['albumi', 'chiara d\'uovo', 'bianco d\'uovo'],
        categoria: 'Proteina',
        calorie100: 43, proteine100: 10.7, carbo100: 0.7, grassi100: 0.0
    },
    {
        nome: 'Tuorlo d\'uovo',
        aliases: ['rosso d\'uovo', 'tuorli'],
        categoria: 'Proteina',
        calorie100: 322, proteine100: 15.9, carbo100: 0.3, grassi100: 28.6
    },

    // ─── FORMAGGI ────────────────────────────────────────────────────────────────
    {
        nome: 'Parmigiano Reggiano',
        aliases: ['parmigiano', 'grana parmigiano'],
        categoria: 'Latticino',
        calorie100: 392, proteine100: 33.5, carbo100: 0, grassi100: 29.7
    },
    {
        nome: 'Grana Padano',
        aliases: ['grana', 'granato'],
        categoria: 'Latticino',
        calorie100: 384, proteine100: 33.1, carbo100: 0, grassi100: 28.5
    },
    {
        nome: 'Mozzarella vaccina',
        aliases: ['mozzarella', 'fior di latte', 'mozzarella fiordilatte'],
        categoria: 'Latticino',
        calorie100: 235, proteine100: 18.1, carbo100: 0.7, grassi100: 18.6
    },
    {
        nome: 'Mozzarella di bufala',
        aliases: ['bufala', 'mozzarella bufala campana'],
        categoria: 'Latticino',
        calorie100: 278, proteine100: 17.0, carbo100: 2.5, grassi100: 22.0
    },
    {
        nome: 'Ricotta vaccina',
        aliases: ['ricotta', 'ricotta fresca'],
        categoria: 'Latticino',
        calorie100: 146, proteine100: 9.4, carbo100: 3.5, grassi100: 10.9
    },
    {
        nome: 'Stracchino',
        aliases: ['crescenza', 'quartirolo'],
        categoria: 'Latticino',
        calorie100: 228, proteine100: 14.0, carbo100: 1.0, grassi100: 19.0
    },
    {
        nome: 'Scamorza',
        aliases: ['scamorza affumicata', 'provola'],
        categoria: 'Latticino',
        calorie100: 334, proteine100: 25.6, carbo100: 0, grassi100: 26.0
    },
    {
        nome: 'Pecorino',
        aliases: ['pecorino romano', 'pecorino stagionato'],
        categoria: 'Latticino',
        calorie100: 419, proteine100: 25.3, carbo100: 0, grassi100: 35.0
    },
    {
        nome: 'Gorgonzola',
        aliases: ['gorgonzola dolce', 'formaggio erborinato'],
        categoria: 'Latticino',
        calorie100: 317, proteine100: 18.9, carbo100: 0, grassi100: 27.1
    },
    {
        nome: 'Asiago',
        aliases: ['asiago stagionato'],
        categoria: 'Latticino',
        calorie100: 352, proteine100: 28.0, carbo100: 0, grassi100: 27.0
    },
    {
        nome: 'Emmental',
        aliases: ['emmentaler', 'groviera'],
        categoria: 'Latticino',
        calorie100: 382, proteine100: 28.5, carbo100: 0, grassi100: 30.0
    },
    {
        nome: 'Fontina',
        aliases: ['fontina valdostana'],
        categoria: 'Latticino',
        calorie100: 343, proteine100: 24.5, carbo100: 0.5, grassi100: 27.0
    },
    {
        nome: 'Cottage Cheese',
        aliases: ['fiocchi di latte'],
        categoria: 'Latticino',
        calorie100: 98, proteine100: 11.1, carbo100: 3.4, grassi100: 4.3
    },

    // ─── LEGUMI (cotti) ──────────────────────────────────────────────────────────
    {
        nome: 'Lenticchie cotte',
        aliases: ['lenticchie', 'zuppa di lenticchie'],
        categoria: 'Carboidrato',
        calorie100: 116, proteine100: 9.0, carbo100: 20.0, grassi100: 0.5
    },
    {
        nome: 'Ceci cotti',
        aliases: ['ceci', 'hummus base'],
        categoria: 'Carboidrato',
        calorie100: 164, proteine100: 9.0, carbo100: 27.4, grassi100: 2.6
    },
    {
        nome: 'Fagioli cotti',
        aliases: ['fagioli borlotti', 'fagioli cannellini cotti'],
        categoria: 'Carboidrato',
        calorie100: 114, proteine100: 7.4, carbo100: 19.4, grassi100: 0.5
    },

    // ─── VERDURE ─────────────────────────────────────────────────────────────────
    {
        nome: 'Zucchine',
        aliases: ['zucchina', 'zucchini'],
        categoria: 'Verdura',
        calorie100: 16, proteine100: 1.3, carbo100: 2.5, grassi100: 0.1
    },
    {
        nome: 'Broccoli',
        aliases: ['broccolo', 'broccoletti', 'cimette di broccoli'],
        categoria: 'Verdura',
        calorie100: 27, proteine100: 3.0, carbo100: 4.4, grassi100: 0.4
    },
    {
        nome: 'Spinaci',
        aliases: ['spinacino', 'spinaci freschi'],
        categoria: 'Verdura',
        calorie100: 22, proteine100: 3.4, carbo100: 1.6, grassi100: 0.7
    },
    {
        nome: 'Carote',
        aliases: ['carota'],
        categoria: 'Verdura',
        calorie100: 35, proteine100: 1.1, carbo100: 7.6, grassi100: 0.2
    },
    {
        nome: 'Pomodori',
        aliases: ['pomodoro', 'pomodorini', 'pomodoro ciliegino'],
        categoria: 'Verdura',
        calorie100: 17, proteine100: 1.2, carbo100: 3.1, grassi100: 0.2
    },
    {
        nome: 'Insalata mista',
        aliases: ['lattuga', 'insalata verde', 'rucola', 'songino', 'valeriana'],
        categoria: 'Verdura',
        calorie100: 15, proteine100: 1.8, carbo100: 1.8, grassi100: 0.3
    },
    {
        nome: 'Peperoni',
        aliases: ['peperone', 'peperone rosso', 'peperone giallo'],
        categoria: 'Verdura',
        calorie100: 28, proteine100: 0.9, carbo100: 6.0, grassi100: 0.3
    },
    {
        nome: 'Melanzane',
        aliases: ['melanzana'],
        categoria: 'Verdura',
        calorie100: 18, proteine100: 1.1, carbo100: 2.6, grassi100: 0.4
    },
    {
        nome: 'Cavolo cappuccio',
        aliases: ['cavolo', 'cavolo bianco', 'verza'],
        categoria: 'Verdura',
        calorie100: 25, proteine100: 1.4, carbo100: 5.3, grassi100: 0.1
    },
    {
        nome: 'Cetrioli',
        aliases: ['cetriolo'],
        categoria: 'Verdura',
        calorie100: 14, proteine100: 0.7, carbo100: 2.2, grassi100: 0.1
    },
    {
        nome: 'Asparagi',
        aliases: ['asparago', 'punte di asparagi'],
        categoria: 'Verdura',
        calorie100: 29, proteine100: 3.6, carbo100: 4.1, grassi100: 0.2
    },
    {
        nome: 'Cavolfiore',
        aliases: ['cavolo fiore', 'cimette di cavolfiore'],
        categoria: 'Verdura',
        calorie100: 25, proteine100: 2.5, carbo100: 4.0, grassi100: 0.3
    },
    {
        nome: 'Funghi champignon',
        aliases: ['champignon', 'funghi', 'fungo'],
        categoria: 'Verdura',
        calorie100: 22, proteine100: 2.5, carbo100: 2.4, grassi100: 0.5
    },
    {
        nome: 'Cipolle',
        aliases: ['cipolla'],
        categoria: 'Verdura',
        calorie100: 26, proteine100: 1.2, carbo100: 5.0, grassi100: 0.2
    },
    {
        nome: 'Aglio',
        aliases: ['spicchio d\'aglio'],
        categoria: 'Verdura',
        calorie100: 41, proteine100: 2.0, carbo100: 8.4, grassi100: 0.1
    },

    // ─── FRUTTA ──────────────────────────────────────────────────────────────────
    {
        nome: 'Mele',
        aliases: ['mela', 'mela golden', 'mela fuji', 'mela rossa'],
        categoria: 'Frutta',
        calorie100: 52, proteine100: 0.3, carbo100: 13.8, grassi100: 0.2
    },
    {
        nome: 'Banane',
        aliases: ['banana'],
        categoria: 'Frutta',
        calorie100: 89, proteine100: 1.1, carbo100: 22.8, grassi100: 0.3
    },
    {
        nome: 'Arance',
        aliases: ['arancia', 'mandarino', 'clementine'],
        categoria: 'Frutta',
        calorie100: 47, proteine100: 0.9, carbo100: 11.8, grassi100: 0.1
    },
    {
        nome: 'Fragole',
        aliases: ['fragola'],
        categoria: 'Frutta',
        calorie100: 27, proteine100: 0.9, carbo100: 5.3, grassi100: 0.4
    },
    {
        nome: 'Ciliegie',
        aliases: ['ciliegia', 'ciliege'],
        categoria: 'Frutta',
        calorie100: 50, proteine100: 0.8, carbo100: 12.8, grassi100: 0.1
    },
    {
        nome: 'Kiwi',
        aliases: ['kiwi verde', 'actinidia'],
        categoria: 'Frutta',
        calorie100: 44, proteine100: 1.0, carbo100: 10.0, grassi100: 0.5
    },
    {
        nome: 'Uva',
        aliases: ['uva bianca', 'uva nera', 'chicchi d\'uva'],
        categoria: 'Frutta',
        calorie100: 67, proteine100: 0.6, carbo100: 17.2, grassi100: 0.2
    },
    {
        nome: 'Pesche',
        aliases: ['pesca', 'nettarine', 'nettarina'],
        categoria: 'Frutta',
        calorie100: 39, proteine100: 0.9, carbo100: 9.5, grassi100: 0.1
    },
    {
        nome: 'Pere',
        aliases: ['pera', 'pera abate'],
        categoria: 'Frutta',
        calorie100: 57, proteine100: 0.4, carbo100: 14.7, grassi100: 0.1
    },
    {
        nome: 'Melone',
        aliases: ['melone giallo', 'anguria', 'cocomero'],
        categoria: 'Frutta',
        calorie100: 34, proteine100: 0.8, carbo100: 8.1, grassi100: 0.2
    },

    // ─── CONDIMENTI / GRASSI ─────────────────────────────────────────────────────
    {
        nome: 'Olio di oliva',
        aliases: ['olio extravergine', 'olio evo', 'extravergine'],
        categoria: 'Condimento/Grassi',
        calorie100: 884, proteine100: 0, carbo100: 0, grassi100: 99.9
    },
    {
        nome: 'Burro',
        aliases: ['burro chiarificato'],
        categoria: 'Condimento/Grassi',
        calorie100: 754, proteine100: 0.8, carbo100: 0.9, grassi100: 83.3
    },
    {
        nome: 'Noci',
        aliases: ['noce', 'gherigli di noce'],
        categoria: 'Condimento/Grassi',
        calorie100: 654, proteine100: 15.2, carbo100: 13.7, grassi100: 65.2
    },
    {
        nome: 'Mandorle',
        aliases: ['mandorla', 'mandorle pelate'],
        categoria: 'Condimento/Grassi',
        calorie100: 575, proteine100: 21.2, carbo100: 19.7, grassi100: 49.4
    },
    {
        nome: 'Arachidi',
        aliases: ['burro di arachidi', 'noccioline americane'],
        categoria: 'Condimento/Grassi',
        calorie100: 567, proteine100: 25.8, carbo100: 16.1, grassi100: 49.2
    }
];

/**
 * Cerca nella tabella alimenti per nome o alias (ricerca parziale, case-insensitive).
 * @param {string} query - Testo da cercare
 * @param {number} limit - Numero massimo di risultati
 * @returns {Array} - Voci corrispondenti
 */
export function searchFoodTable(query, limit = 6) {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    return foodTable
        .filter(item => {
            if (item.nome.toLowerCase().includes(q)) return true;
            return item.aliases.some(a => a.toLowerCase().includes(q));
        })
        .slice(0, limit);
}
