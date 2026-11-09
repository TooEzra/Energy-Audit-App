// Common equipment with INDICATIVE typical ratings (watts), used only to pre-fill the Add equipment form.
// Always check the nameplate; every value stays editable. [name, typical rating in W]
export const EQUIPMENT_CATALOG = {
  lighting: [['LED tube (T8)', 18], ['LED bulb', 9], ['Fluorescent tube (T8)', 36], ['Fluorescent tube (T5)', 28], ['Compact fluorescent lamp (CFL)', 15], ['Incandescent bulb', 60], ['Halogen spotlight', 50], ['Halogen floodlight', 150], ['LED floodlight', 50], ['LED street / security light', 100], ['Emergency / exit sign', 5]],
  ac_ventilation: [['Split AC 9,000 BTU', 900], ['Split AC 12,000 BTU', 1200], ['Split AC 18,000 BTU', 1800], ['Split AC 24,000 BTU', 2400], ['Window AC unit', 1500], ['Cassette / ducted AC', 3500], ['Chiller (small)', 25000], ['Air handling unit fan', 5500], ['Ceiling fan', 75], ['Pedestal / wall fan', 55], ['Extractor fan', 40], ['Evaporative cooler', 200]],
  motors_pumps: [['Water booster pump', 2200], ['Borehole pump', 3000], ['Circulation pump', 750], ['Sump / sewage pump', 750], ['Fire pump', 7500], ['Air compressor', 3000], ['Electric motor (generic)', 5500]],
  ict: [['Desktop computer', 120], ['Laptop', 65], ['Computer monitor', 30], ['Server', 400], ['Network switch', 50], ['Wi-Fi access point / router', 15], ['UPS', 300]],
  refrigeration: [['Domestic refrigerator', 150], ['Chest freezer', 200], ['Fridge-freezer (upright)', 250], ['Display chiller', 400], ['Water dispenser (hot & cold)', 500], ['Ice machine', 600], ['Vaccine / medical fridge', 100], ['Walk-in cold room', 3000]],
  water_heating: [['Storage water heater (geyser)', 3000], ['Instant shower heater', 5500], ['Heat-pump water heater', 1200], ['Hot water urn', 2500]],
  kitchen_catering: [['Electric cooker (4-plate)', 8000], ['Industrial oven', 6000], ['Microwave oven', 1200], ['Electric kettle', 2000], ['Rice cooker', 700], ['Toaster', 800], ['Dishwasher', 2000], ['Food warmer', 1500], ['Deep fryer', 3000], ['Blender', 400]],
  office_equipment: [['Photocopier / multifunction printer', 1300], ['Laser printer', 500], ['Inkjet printer', 30], ['Document scanner', 30], ['Paper shredder', 300], ['Telephone exchange (PBX)', 100]],
  medical_lab: [['Autoclave / sterilizer', 3000], ['X-ray machine', 5000], ['Ultrasound scanner', 300], ['Oxygen concentrator', 350], ['Patient monitor', 80], ['ECG machine', 100], ['Suction pump', 150], ['Dental chair', 600], ['Laboratory centrifuge', 300], ['Laboratory oven', 2000], ['Laboratory incubator', 400], ['Fume cupboard', 500], ['Laboratory refrigerator', 200], ['Blood / chemistry analyser', 300]],
  laundry: [['Washing machine (industrial)', 2200], ['Tumble dryer', 3000], ['Clothes iron', 1200], ['Industrial ironer', 6000]],
  lifts: [['Passenger lift', 7500], ['Goods lift', 11000], ['Platform / wheelchair lift', 2200], ['Escalator', 7500]],
  audio_visual: [['Projector', 300], ['Interactive display / smart board', 200], ['Television', 100], ['Public address amplifier', 200], ['Sound system', 500], ['Stage lighting', 1000]],
  workshop: [['Arc welding machine', 5000], ['Lathe', 2200], ['Milling machine', 3000], ['Drilling machine', 750], ['Bench grinder', 400], ['Circular saw', 1500], ['Table saw', 2200], ['3D printer', 150]],
  security: [['CCTV camera', 10], ['CCTV recorder (DVR/NVR)', 50], ['Electric fence energiser', 30], ['Access control panel', 30], ['Alarm panel', 20], ['Automatic gate motor', 300]],
  other: [['Electric space heater', 2000], ['Hand dryer', 1800], ['Vending machine', 400], ['Dehumidifier', 300], ['Battery charger', 200]],
};
