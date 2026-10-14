-- Reference data: placeholder plan, festival calendar (Oct 2026 – Oct 2027), quick-start cards.
-- Users and sample clients are created by `npm run seed` (scripts/seed.ts), which needs the
-- Supabase Auth admin API.
--
-- Lunar-calendar festival dates below are best estimates. Check them once in
-- Expert → Settings → Festival calendar before relying on them.

insert into public.plans (name, price_inr, limits)
select 'Pilot', 0, '{"requests_per_month": null, "content_types": null}'
where not exists (select 1 from public.plans where name = 'Pilot');

insert into public.festivals (name, name_hi, date, industries, default_lead_days) values
  ('World Food Day',            'विश्व खाद्य दिवस',        '2026-10-16', '{restaurant,cafe,cloud_kitchen}', 5),
  ('Durga Puja',                'दुर्गा पूजा',              '2026-10-17', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Dussehra',                  'दशहरा',                   '2026-10-20', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Karva Chauth',              'करवा चौथ',                '2026-10-29', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('Dhanteras',                 'धनतेरस',                  '2026-11-06', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Diwali',                    'दिवाली',                  '2026-11-08', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('Bhai Dooj',                 'भाई दूज',                 '2026-11-11', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Children''s Day',           'बाल दिवस',                '2026-11-14', '{restaurant,cafe,cloud_kitchen}', 5),
  ('Chhath Puja',               'छठ पूजा',                 '2026-11-15', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Wedding season',            'शादी का सीज़न',            '2026-11-21', '{salon,restaurant,cafe,cloud_kitchen}', 10),
  ('Guru Nanak Jayanti',        'गुरु नानक जयंती',          '2026-11-24', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Christmas',                 'क्रिसमस',                 '2026-12-25', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('New Year''s Eve',           'नए साल की शाम',            '2026-12-31', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('New Year',                  'नया साल',                 '2027-01-01', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Lohri',                     'लोहड़ी',                   '2027-01-13', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Makar Sankranti / Pongal',  'मकर संक्रांति / पोंगल',      '2027-01-14', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Republic Day',              'गणतंत्र दिवस',             '2027-01-26', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Vasant Panchami',           'वसंत पंचमी',               '2027-02-11', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Valentine''s Day',          'वैलेंटाइन डे',             '2027-02-14', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('Maha Shivratri',            'महा शिवरात्रि',            '2027-03-06', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Women''s Day',              'महिला दिवस',               '2027-03-08', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Eid ul-Fitr',               'ईद उल-फ़ित्र',              '2027-03-10', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Holi',                      'होली',                    '2027-03-22', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('Chaitra Navratri / Gudi Padwa', 'चैत्र नवरात्रि / गुड़ी पड़वा', '2027-04-07', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Baisakhi',                  'बैसाखी',                  '2027-04-14', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Ram Navami',                'राम नवमी',                '2027-04-15', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Mother''s Day',             'मदर्स डे',                '2027-05-09', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('Eid al-Adha',               'ईद उल-अज़हा',              '2027-05-17', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Father''s Day',             'फादर्स डे',               '2027-06-20', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Monsoon season',            'मानसून',                  '2027-07-01', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Friendship Day',            'फ्रेंडशिप डे',             '2027-08-01', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Independence Day',          'स्वतंत्रता दिवस',           '2027-08-15', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Raksha Bandhan',            'रक्षा बंधन',               '2027-08-17', '{salon,restaurant,cafe,cloud_kitchen}', 7),
  ('Janmashtami',               'जन्माष्टमी',               '2027-08-25', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Ganesh Chaturthi',          'गणेश चतुर्थी',             '2027-09-04', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Onam',                      'ओणम',                    '2027-09-12', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Navratri',                  'नवरात्रि',                 '2027-09-30', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('Dussehra',                  'दशहरा',                   '2027-10-09', '{salon,restaurant,cafe,cloud_kitchen}', 5),
  ('World Food Day',            'विश्व खाद्य दिवस',        '2027-10-16', '{restaurant,cafe,cloud_kitchen}', 5)
on conflict do nothing;

-- Quick-start cards. Food businesses (restaurant, cafe, cloud kitchen) share one set.
do $$
declare
  ind public.industry;
begin
  foreach ind in array array['restaurant', 'cafe', 'cloud_kitchen']::public.industry[] loop
    insert into public.quick_start_cards (industry, key, label_en, label_hi, icon, content_type, sort, questions) values
    (ind, 'todays_special', 'Today''s special', 'आज का स्पेशल', 'chef-hat', 'single_post', 1,
     '[{"id":"item","type":"text","q_en":"Which dish is today''s special?","q_hi":"आज का स्पेशल कौन सा पकवान है?"},
       {"id":"price","type":"choice","q_en":"Show the price on the post?","q_hi":"पोस्ट पर दाम दिखाएँ?","options":[{"en":"Yes, show price","hi":"हाँ, दाम दिखाएँ"},{"en":"No price","hi":"दाम नहीं"}]},
       {"id":"photo","type":"photo","q_en":"Add a photo of the dish","q_hi":"पकवान की फ़ोटो जोड़ें"}]'),
    (ind, 'new_offer', 'New offer', 'नया ऑफ़र', 'tag', 'single_post', 2,
     '[{"id":"offer","type":"choice","q_en":"What kind of offer?","q_hi":"कैसा ऑफ़र है?","options":[{"en":"% discount","hi":"% छूट"},{"en":"Buy 1 Get 1","hi":"एक के साथ एक फ्री"},{"en":"Combo deal","hi":"कॉम्बो डील"},{"en":"Free item","hi":"फ्री आइटम"}],"allow_text":true},
       {"id":"until","type":"choice","q_en":"Till when?","q_hi":"कब तक?","options":[{"en":"Today only","hi":"सिर्फ़ आज"},{"en":"This week","hi":"इस हफ़्ते"},{"en":"This month","hi":"इस महीने"}]},
       {"id":"photo","type":"photo","q_en":"Any photo to use?","q_hi":"कोई फ़ोटो लगानी है?"}]'),
    (ind, 'festival_post', 'Festival post', 'त्योहार पोस्ट', 'party-popper', 'festival_greeting', 3,
     '[{"id":"festival","type":"text","q_en":"Which festival?","q_hi":"कौन सा त्योहार?"},
       {"id":"offer","type":"choice","q_en":"Add a festival offer?","q_hi":"त्योहार का ऑफ़र जोड़ें?","options":[{"en":"Yes, add offer","hi":"हाँ, ऑफ़र जोड़ें"},{"en":"Only greetings","hi":"सिर्फ़ शुभकामनाएँ"}],"allow_text":true}]'),
    (ind, 'menu_spotlight', 'Menu item spotlight', 'मेन्यू आइटम ख़ास', 'utensils', 'single_post', 4,
     '[{"id":"item","type":"text","q_en":"Which menu item?","q_hi":"कौन सा मेन्यू आइटम?"},
       {"id":"photo","type":"photo","q_en":"Add a photo of it","q_hi":"उसकी फ़ोटो जोड़ें"}]'),
    (ind, 'customer_review', 'Customer review post', 'ग्राहक रिव्यू पोस्ट', 'star', 'single_post', 5,
     '[{"id":"review","type":"text","q_en":"Type or paste the review","q_hi":"रिव्यू लिखें या पेस्ट करें"},
       {"id":"photo","type":"photo","q_en":"Screenshot or photo (optional)","q_hi":"स्क्रीनशॉट या फ़ोटो (अगर हो)"}]'),
    (ind, 'reel_idea', 'Reel idea', 'रील आइडिया', 'clapperboard', 'reel', 6,
     '[{"id":"topic","type":"choice","q_en":"What should the reel show?","q_hi":"रील में क्या दिखाना है?","options":[{"en":"Food being made","hi":"खाना बनते हुए"},{"en":"Behind the scenes","hi":"किचन के पीछे की झलक"},{"en":"Happy customers","hi":"खुश ग्राहक"},{"en":"New dish","hi":"नया पकवान"}],"allow_text":true}]')
    on conflict (industry, key) do nothing;
  end loop;

  insert into public.quick_start_cards (industry, key, label_en, label_hi, icon, content_type, sort, questions) values
  ('salon', 'new_offer', 'New offer', 'नया ऑफ़र', 'tag', 'single_post', 1,
   '[{"id":"service","type":"text","q_en":"Offer on which service?","q_hi":"किस सर्विस पर ऑफ़र है?"},
     {"id":"offer","type":"choice","q_en":"What kind of offer?","q_hi":"कैसा ऑफ़र है?","options":[{"en":"% discount","hi":"% छूट"},{"en":"Package deal","hi":"पैकेज डील"},{"en":"Free add-on","hi":"फ्री ऐड-ऑन"}],"allow_text":true},
     {"id":"until","type":"choice","q_en":"Till when?","q_hi":"कब तक?","options":[{"en":"Today only","hi":"सिर्फ़ आज"},{"en":"This week","hi":"इस हफ़्ते"},{"en":"This month","hi":"इस महीने"}]}]'),
  ('salon', 'before_after', 'Before & after', 'पहले और बाद', 'sparkles', 'carousel', 2,
   '[{"id":"service","type":"text","q_en":"Which service was done?","q_hi":"कौन सी सर्विस की गई?"},
     {"id":"photo","type":"photo","q_en":"Add the before and after photos","q_hi":"पहले और बाद की फ़ोटो जोड़ें"}]'),
  ('salon', 'festival_post', 'Festival post', 'त्योहार पोस्ट', 'party-popper', 'festival_greeting', 3,
   '[{"id":"festival","type":"text","q_en":"Which festival?","q_hi":"कौन सा त्योहार?"},
     {"id":"offer","type":"choice","q_en":"Add a festival offer?","q_hi":"त्योहार का ऑफ़र जोड़ें?","options":[{"en":"Yes, add offer","hi":"हाँ, ऑफ़र जोड़ें"},{"en":"Only greetings","hi":"सिर्फ़ शुभकामनाएँ"}],"allow_text":true}]'),
  ('salon', 'new_service', 'New service', 'नई सर्विस', 'scissors', 'single_post', 4,
   '[{"id":"service","type":"text","q_en":"What is the new service?","q_hi":"नई सर्विस क्या है?"},
     {"id":"price","type":"choice","q_en":"Show the price on the post?","q_hi":"पोस्ट पर दाम दिखाएँ?","options":[{"en":"Yes, show price","hi":"हाँ, दाम दिखाएँ"},{"en":"No price","hi":"दाम नहीं"}]},
     {"id":"photo","type":"photo","q_en":"Any photo to use?","q_hi":"कोई फ़ोटो लगानी है?"}]'),
  ('salon', 'customer_review', 'Customer review post', 'ग्राहक रिव्यू पोस्ट', 'star', 'single_post', 5,
   '[{"id":"review","type":"text","q_en":"Type or paste the review","q_hi":"रिव्यू लिखें या पेस्ट करें"},
     {"id":"photo","type":"photo","q_en":"Screenshot or photo (optional)","q_hi":"स्क्रीनशॉट या फ़ोटो (अगर हो)"}]'),
  ('salon', 'reel_idea', 'Reel idea', 'रील आइडिया', 'clapperboard', 'reel', 6,
   '[{"id":"topic","type":"choice","q_en":"What should the reel show?","q_hi":"रील में क्या दिखाना है?","options":[{"en":"A makeover","hi":"मेकओवर"},{"en":"Hair styling","hi":"हेयर स्टाइलिंग"},{"en":"Salon tour","hi":"सैलून की झलक"},{"en":"Happy customers","hi":"खुश ग्राहक"}],"allow_text":true}]')
  on conflict (industry, key) do nothing;
end $$;
