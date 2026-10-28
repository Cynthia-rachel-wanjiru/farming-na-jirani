import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, Sparkles, Lightbulb, Droplets, Sprout, Bug, TrendingUp, Loader, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';

interface AIMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIAssistantProps {
  language: 'en' | 'sw';
  userName: string;
  onBack: () => void;
}

export function AIAssistant({ language, userName, onBack }: AIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      content: language === 'en'
        ? `Hello ${userName.split(' ')[0]}! 👋 I'm FarmEcho AI, your farming assistant. I can help you with:\n\n🌱 Crop management and planting advice\n💧 Irrigation and water management\n🐛 Pest and disease identification\n🌾 Fertilizer recommendations\n📊 Market prices and trends\n☀️ Weather and climate tips\n\nWhat would you like to know today?`
        : `Habari ${userName.split(' ')[0]}! 👋 Mimi ni FarmEcho AI, msaidizi wako wa kilimo. Ninaweza kukusaidia na:\n\n🌱 Usimamizi wa mazao na ushauri wa kupanda\n💧 Umwagiliaji na usimamizi wa maji\n🐛 Utambuzi wa wadudu na magonjwa\n🌾 Mapendekezo ya mbolea\n📊 Bei za soko na mwelekeo\n☀️ Vidokezo vya hali ya hewa na tabia nchi\n\nUngependa kujua nini leo?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const translations = {
    en: {
      title: 'Ask AI Assistant',
      subtitle: 'Get instant farming advice powered by AI',
      placeholder: 'Ask me anything about farming...',
      send: 'Send',
      typing: 'AI is thinking...',
      quickQuestions: 'Quick Questions',
      suggestions: [
        { icon: Sprout, text: 'When to plant maize?', query: 'when should I plant maize' },
        { icon: Droplets, text: 'Watering schedule?', query: 'how often should I water my crops' },
        { icon: Bug, text: 'Pest control tips?', query: 'how to control pests naturally' },
        { icon: TrendingUp, text: 'Best crops to grow?', query: 'what are the most profitable crops' },
      ],
    },
    sw: {
      title: 'Uliza Msaidizi wa AI',
      subtitle: 'Pata ushauri wa haraka wa kilimo unaotumia AI',
      placeholder: 'Niulize chochote kuhusu kilimo...',
      send: 'Tuma',
      typing: 'AI inafikiria...',
      quickQuestions: 'Maswali ya Haraka',
      suggestions: [
        { icon: Sprout, text: 'Lini kupanda mahindi?', query: 'ni lini ninapaswa kupanda mahindi' },
        { icon: Droplets, text: 'Ratiba ya kumwagilia?', query: 'ni mara ngapi ninapaswa kumwagilia mazao yangu' },
        { icon: Bug, text: 'Vidokezo vya kudhibiti wadudu?', query: 'jinsi ya kudhibiti wadudu kwa njia ya asili' },
        { icon: TrendingUp, text: 'Mazao bora ya kupanda?', query: 'ni mazao gani yenye faida zaidi' },
      ],
    },
  };

  const t = translations[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // AI Response Generator
  const generateAIResponse = (userQuery: string): string => {
    const query = userQuery.toLowerCase();

    // Knowledge base for farming questions
    const responses: { [key: string]: { en: string; sw: string } } = {
      maize: {
        en: `**Maize Growing Guide:**\n\n🌱 **Planting Time:** Plant at the start of long rains (March-April) or short rains (October-November) in Kenya.\n\n🌾 **Spacing:** 75cm between rows, 25cm between plants.\n\n💧 **Water:** Needs 500-800mm of water during growing season. Critical at tasseling and grain filling.\n\n🌿 **Fertilizer:** Apply DAP (50kg/acre) at planting, then top-dress with CAN (50kg/acre) at knee-high stage.\n\n⏰ **Harvest:** Ready in 3-4 months when kernels are hard and leaves turn brown.`,
        sw: `**Mwongozo wa Kupanda Mahindi:**\n\n🌱 **Wakati wa Kupanda:** Panda mwanzoni mwa mvua za masika (Machi-Aprili) au mvua za vuli (Oktoba-Novemba) Kenya.\n\n🌾 **Umbali:** Cm 75 kati ya mistari, cm 25 kati ya mimea.\n\n💧 **Maji:** Inahitaji mm 500-800 za maji wakati wa kukua. Muhimu wakati wa kutoa maua na kujaza nafaka.\n\n🌿 **Mbolea:** Tumia DAP (kg 50/ekari) wakati wa kupanda, kisha ongeza CAN (kg 50/ekari) wakati wa hatua ya goti.\n\n⏰ **Mavuno:** Iko tayari katika miezi 3-4 wakati punje ni ngumu na majani yanageuka kahawia.`,
      },
      irrigation: {
        en: `**Irrigation Best Practices:**\n\n💧 **Frequency:** Water deeply 2-3 times per week rather than daily light watering.\n\n⏰ **Timing:** Early morning (5-7 AM) is best to reduce evaporation.\n\n🌡️ **Amount:** Most vegetables need 25-50mm per week. Use your finger - soil should be moist 10cm deep.\n\n🚿 **Method:** Drip irrigation is most efficient (90% vs 60% for sprinklers).\n\n⚠️ **Signs of Problems:**\n- Wilting = Too little water\n- Yellow leaves = Too much water\n- Brown leaf tips = Inconsistent watering`,
        sw: `**Mbinu Bora za Umwagiliaji:**\n\n💧 **Mzunguko:** Mwagilia kwa kina mara 2-3 kwa wiki badala ya kumwagilia kidogo kila siku.\n\n⏰ **Muda:** Asubuhi mapema (5-7 AM) ni bora zaidi kupunguza mvuke.\n\n🌡️ **Kiasi:** Mboga nyingi zinahitaji mm 25-50 kwa wiki. Tumia kidole chako - udongo unapaswa kuwa na unyevu kina cha cm 10.\n\n🚿 **Njia:** Umwagiliaji wa tone ni wa ufanisi zaidi (90% dhidi ya 60% kwa vinyunyiziaji).\n\n⚠️ **Dalili za Matatizo:**\n- Kunyauka = Maji machache sana\n- Majani ya njano = Maji mengi sana\n- Ncha za majani za kahawia = Umwagiliaji usio na uthabiti`,
      },
      pests: {
        en: `**Natural Pest Control Methods:**\n\n🌿 **Neem Oil:** Spray diluted neem oil (2 tablespoons per liter) for aphids, whiteflies.\n\n🧄 **Garlic Spray:** Crush 5 cloves in 1L water, strain, spray on leaves for general pests.\n\n🌼 **Companion Planting:** Plant marigolds to repel nematodes. Basil deters flies and mosquitoes.\n\n🐦 **Natural Predators:** Encourage birds, ladybugs, praying mantis in your farm.\n\n🔄 **Crop Rotation:** Change crop families each season to break pest cycles.\n\n🧹 **Hygiene:** Remove infected plants immediately. Clean tools between uses.`,
        sw: `**Njia za Asili za Kudhibiti Wadudu:**\n\n🌿 **Mafuta ya Mwarobaini:** Nyunyizia mafuta ya mwarobaini yaliyochujwa (vijiko 2 vya chai kwa lita) kwa ajili ya aphids, nzi weupe.\n\n🧄 **Dawa ya Kitunguu Saumu:** Ponda karafuu 5 katika maji ya lita 1, chuja, nyunyizia kwenye majani kwa ajili ya wadudu wa jumla.\n\n🌼 **Kupanda Pamoja:** Panda maua ya marigold kuzuia nematodes. Basil inazuia nzi na mbu.\n\n🐦 **Wawindaji wa Asili:** Himiza ndege, dudu wa Abu, mantis wa sala katika shamba lako.\n\n🔄 **Mzunguko wa Mazao:** Badilisha familia za mazao kila msimu kuvunja mizunguko ya wadudu.\n\n🧹 **Usafi:** Ondoa mimea iliyoambukizwa mara moja. Safisha zana kati ya matumizi.`,
      },
      fertilizer: {
        en: `**Fertilizer Application Guide:**\n\n📊 **NPK Numbers:** N=Nitrogen (leaves), P=Phosphorus (roots), K=Potassium (fruits)\n\n🌱 **For Leafy Vegetables:** Use high N like 20-10-10. Apply every 2 weeks.\n\n🍅 **For Fruiting Crops:** Use balanced 10-10-10 or high K like 10-10-20 during fruiting.\n\n🌾 **For Cereals:** DAP (18-46-0) at planting, CAN (21-0-0) as top dressing.\n\n💡 **Application Tips:**\n- Apply in the morning or evening\n- Water before and after application\n- Keep fertilizer 10cm away from plant stem\n- Don't exceed recommended rates - more ≠ better`,
        sw: `**Mwongozo wa Kutumia Mbolea:**\n\n📊 **Nambari za NPK:** N=Nitrojeni (majani), P=Fosforasi (mizizi), K=Potasiamu (matunda)\n\n🌱 **Kwa Mboga za Majani:** Tumia N ya juu kama 20-10-10. Tumia kila wiki 2.\n\n🍅 **Kwa Mazao ya Matunda:** Tumia 10-10-10 iliyosawazishwa au K ya juu kama 10-10-20 wakati wa kutoa matunda.\n\n🌾 **Kwa Nafaka:** DAP (18-46-0) wakati wa kupanda, CAN (21-0-0) kama kuongeza juu.\n\n💡 **Vidokezo vya Matumizi:**\n- Tumia asubuhi au jioni\n- Mwagilia kabla na baada ya kutumia\n- Weka mbolea cm 10 mbali na shina la mmea\n- Usizidi viwango vilivyopendekezwa - zaidi ≠ bora`,
      },
      prices: {
        en: `**Current Market Price Trends (June 2026):**\n\n🌾 **Maize:** KES 40-45 per kg (wholesale), KES 50-55 (retail)\n📈 Trend: Stable, expect slight increase in dry season\n\n🥔 **Potatoes:** KES 60-70 per kg\n📈 Trend: Rising due to low supply\n\n🍅 **Tomatoes:** KES 80-100 per kg\n📉 Trend: Decreasing as more farmers harvest\n\n💡 **Tip:** Sell tomatoes now! Prices dropping as supply increases. Hold maize for better prices in August-September.`,
        sw: `**Mitindo ya Bei ya Soko ya Sasa (Juni 2026):**\n\n🌾 **Mahindi:** KES 40-45 kwa kg (jumla), KES 50-55 (rejareja)\n📈 Mwelekeo: Imara, tarajia ongezeko kidogo katika msimu wa kiangazi\n\n🥔 **Viazi:** KES 60-70 kwa kg\n📈 Mwelekeo: Inaongezeka kutokana na usambazaji mdogo\n\n🍅 **Nyanya:** KES 80-100 kwa kg\n📉 Mwelekeo: Inapungua kwa kuwa wakulima zaidi wanavuna\n\n💡 **Kidokezo:** Uza nyanya sasa! Bei zinapungua kwa kuwa usambazaji unaongezeka. Shikilia mahindi kwa bei bora Agosti-Septemba.`,
      },
      weather: {
        en: `**Weather Tips for Kenyan Farmers:**\n\n🌧️ **Rainy Seasons:**\n- Long rains: March-May (best for maize, beans)\n- Short rains: October-December (beans, vegetables)\n\n☀️ **Dry Seasons:**\n- January-February: Harvest and storage\n- June-September: Irrigation critical\n\n💡 **Climate-Smart Practices:**\n- Mulching reduces water loss by 70%\n- Drought-resistant varieties: Katumani maize, Punda beans\n- Rainwater harvesting: Can provide 50% of irrigation needs\n\n📱 **Stay Updated:** Check FarmEcho weather forecasts daily for your region.`,
        sw: `**Vidokezo vya Hali ya Hewa kwa Wakulima wa Kenya:**\n\n🌧️ **Misimu ya Mvua:**\n- Mvua ndefu: Machi-Mei (bora kwa mahindi, maharage)\n- Mvua fupi: Oktoba-Desemba (maharage, mboga)\n\n☀️ **Misimu Kavu:**\n- Januari-Februari: Mavuno na uhifadhi\n- Juni-Septemba: Umwagiliaji muhimu\n\n💡 **Mbinu Zinazojali Hali ya Hewa:**\n- Kufunika udongo hupunguza upotevu wa maji kwa 70%\n- Aina zinazostahimili ukame: Mahindi ya Katumani, maharage ya Punda\n- Ukusanyaji wa maji ya mvua: Unaweza kutoa 50% ya mahitaji ya umwagiliaji\n\n📱 **Endelea Kusasishwa:** Angalia utabiri wa hali ya hewa ya FarmEcho kila siku kwa mkoa wako.`,
      },
      default: {
        en: `I can help you with farming questions! Here are some topics I know well:\n\n🌾 Crop planting and management (maize, beans, tomatoes, etc.)\n💧 Irrigation and water management\n🐛 Pest and disease control\n🌿 Fertilizer and soil health\n📊 Market prices and trends\n☀️ Weather and climate adaptation\n\nPlease ask me a specific question, or try one of the quick questions above!`,
        sw: `Ninaweza kukusaidia na maswali ya kilimo! Hapa kuna mada ninazozijua vizuri:\n\n🌾 Kupanda na kusimamia mazao (mahindi, maharage, nyanya, n.k.)\n💧 Umwagiliaji na usimamizi wa maji\n🐛 Kudhibiti wadudu na magonjwa\n🌿 Mbolea na afya ya udongo\n📊 Bei za soko na mwelekeo\n☀️ Hali ya hewa na kubadilika kwa tabia nchi\n\nTafadhali niulize swali maalum, au jaribu mojawapo ya maswali ya haraka hapo juu!`,
      },
    };

    // Match query to knowledge base
    if (query.includes('maize') || query.includes('mahindi') || query.includes('corn')) {
      return responses.maize[language];
    }
    if (query.includes('water') || query.includes('irrigat') || query.includes('maji') || query.includes('mwagili')) {
      return responses.irrigation[language];
    }
    if (query.includes('pest') || query.includes('insect') || query.includes('wadudu') || query.includes('bug') || query.includes('control')) {
      return responses.pests[language];
    }
    if (query.includes('fertilizer') || query.includes('mbolea') || query.includes('npk') || query.includes('nutrient')) {
      return responses.fertilizer[language];
    }
    if (query.includes('price') || query.includes('market') || query.includes('sell') || query.includes('bei') || query.includes('soko')) {
      return responses.prices[language];
    }
    if (query.includes('weather') || query.includes('rain') || query.includes('climate') || query.includes('hali ya hewa') || query.includes('mvua')) {
      return responses.weather[language];
    }

    // Crop-specific responses
    if (query.includes('tomato') || query.includes('nyanya')) {
      return language === 'en'
        ? `**Tomato Growing Tips:**\n\n🌱 Plant tomatoes during rainy seasons for best results.\n💧 Water regularly but avoid waterlogging.\n🌿 Use NPK 10-10-20 fertilizer for better fruiting.\n🐛 Watch for late blight - spray with copper fungicide if needed.\n⏰ Harvest after 2.5-3 months when fruits are firm and red.`
        : `**Vidokezo vya Kupanda Nyanya:**\n\n🌱 Panda nyanya wakati wa misimu ya mvua kwa matokeo bora.\n💧 Mwagilia mara kwa mara lakini epuka maji mengi.\n🌿 Tumia mbolea ya NPK 10-10-20 kwa matunda bora.\n🐛 Angalia ukungu wa mwisho - nyunyizia na dawa ya kuangamiza kuvu ya shaba ikiwa ni lazima.\n⏰ Vuna baada ya miezi 2.5-3 wakati matunda ni imara na mekundu.`;
    }

    if (query.includes('bean') || query.includes('maharage')) {
      return language === 'en'
        ? `**Bean Farming Guide:**\n\n🌱 Plant at start of rains, 45cm between rows.\n💧 Beans are drought-resistant but need water at flowering.\n🌿 Minimal fertilizer needed - beans fix their own nitrogen!\n⏰ Ready to harvest in 2-3 months.\n💡 Intercrop with maize for better yields!`
        : `**Mwongozo wa Kilimo cha Maharage:**\n\n🌱 Panda mwanzoni mwa mvua, cm 45 kati ya mistari.\n💧 Maharage yanastahimili ukame lakini yanahitaji maji wakati wa kutoa maua.\n🌿 Mbolea kidogo inahitajika - maharage yanatengeneza nitrojeni yao wenyewe!\n⏰ Tayari kuvunwa katika miezi 2-3.\n💡 Panda pamoja na mahindi kwa mavuno bora!`;
    }

    // Default response
    return responses.default[language];
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend) return;

    // Add user message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Build conversation history for API (last 10)
      const history = [...messages, userMessage].slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.content
      }));

      const sessionToken = localStorage.getItem('farm_echo_session_token');
      const result = await api.chatAI(history, language, sessionToken);
      
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        content: result?.response || generateAIResponse(textToSend),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    } catch (error) {
      // Fallback to local knowledge base
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(textToSend),
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (query: string) => {
    handleSendMessage(query);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-lg p-6 mb-4"
      >
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <Bot className="w-10 h-10 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {t.title}
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </h2>
            <p className="text-purple-100">{t.subtitle}</p>
          </div>
        </div>

        {/* Quick Questions */}
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            {t.quickQuestions}:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {t.suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(suggestion.query)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg px-3 py-2 text-sm transition-all"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-left">{suggestion.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Chat Messages */}
      <div className="bg-white rounded-xl shadow-lg mb-4 overflow-hidden">
        <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50 to-white">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 ${
                    message.isUser
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border-2 border-purple-200 text-gray-800 shadow-md'
                  }`}
                >
                  {!message.isUser && (
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-purple-600">FarmEcho AI</span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  <div className={`text-xs mt-2 ${message.isUser ? 'opacity-75 text-right' : 'opacity-50'}`}>
                    {message.timestamp.toLocaleTimeString(language === 'en' ? 'en-KE' : 'sw-KE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border-2 border-purple-200 rounded-2xl px-5 py-3 shadow-md">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 text-purple-600 animate-spin" />
                  <span className="text-sm text-gray-600">{t.typing}</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="border-t-2 border-purple-100 p-4 bg-white"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">{t.send}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}