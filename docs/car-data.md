# Real car reference data (input for src/physics v2 handling)
Purpose: real-world reference figures for tuning `CarTuning` in the v2 physics model; not game data and not a contract.
Date: 2026-11-15. Figures are typical published values (maker data, spec databases, period magazine tests); markets differ.
'est.' = my engineering estimate (CG from car type, frontal area = width x height x 0.85). 'unverified' = no source found.
'2nd-hand' = magazine figure quoted by a secondary site, not read in the original magazine. Weights are DIN/kerb unless noted.
Two figures in one cell mean the sources disagree; both are given, with the better-supported one first.

## 1. Honda Civic Type R EK9 (1997-2000, JDM, B16B, 5MT)
| Item | Value |
|---|---|
| Mass / front weight | 1,050-1,070 kg (Wikipedia, auto-data); 1,090 kg (civictyper.org) / front % unverified (~62 est.) |
| Wheelbase / track F-R | 2,620 mm / 1,480-1,480 mm |
| CG height / frontal area | 0.48 m est. / 1.96 m^2 est. |
| Drivetrain / diff | FWD / front helical LSD |
| Tyres F / R | 195/55R15 / 195/55R15 |
| Power | 185 PS (136 kW) @ 8,200 rpm |
| Torque | 160 Nm (16.3 kgm) @ 7,500 rpm |
| Redline / limiter | 8,400 rpm (implied by Wikipedia's Spoon N1 note); limiter unverified |
| Gears 1-5 | 3.230 / 2.105 / 1.458 / 1.107 / 0.848 |
| Final drive | 4.400 |
| Cd | unverified |
| 0-100 / 0-200 km/h | 6.6 s (auto-data); 0-97 6.7 s (Wikipedia) / 0-200 unverified |
| 100-0 braking / skidpad | unverified / unverified |
| Top speed | 225 km/h |
Sources: https://en.wikipedia.org/wiki/Honda_Civic_Type_R ; https://civictyper.org/ek9civic.html ; https://www.auto-data.net/en/honda-civic-type-r-ek9-1.6-185hp-47228

## 2. Nissan 350Z (2003-2005, VQ35DE, 6MT, US spec; 2005 Rev-up engine noted)
| Item | Value |
|---|---|
| Mass / front weight | 1,446-1,473 kg by trim (3,188-3,247 lb); EU 283 hp car 1,545 kg (auto-data) / 53 % |
| Wheelbase / track F-R | 2,650 mm / 1,534-1,544 mm (60.4 / 60.8 in) |
| CG height / frontal area | 0.47 m est. / 2.03 m^2 est. |
| Drivetrain / diff | RWD / viscous LSD (all trims except Base: open) |
| Tyres F / R | 17 in: 225/50R17 / 235/50R17; 18 in (Perf/Track/Touring): 225/45R18 / 245/45R18 |
| Power | 287 hp (291 PS) @ 6,200 rpm; 2005 Rev-up 300 hp @ 6,400 rpm |
| Torque | 371 Nm (274 lb-ft) @ 4,800 rpm; Rev-up 353 Nm @ 4,800 rpm |
| Redline / limiter | 6,600 rpm max engine speed (2003-04) |
| Gears 1-6 | 3.794 / 2.324 / 1.624 / 1.271 / 1.000 / 0.794 |
| Final drive | 3.538 |
| Cd | 0.30 (Track 0.29) |
| 0-100 / 0-200 km/h | 5.9 s (EU car, auto-data); C/D 0-60 mph 5.4 s (2nd-hand) / 0-200 unverified |
| 100-0 braking / skidpad | C/D 70-0 mph 164 ft = 50 m (2nd-hand) / 0.88 g (C/D, 2nd-hand) |
| Top speed | 250 km/h (limited) |
Sources: https://350z-uk.com/topic/32082-specifications-for-newbies-20032006-models ; https://en.wikipedia.org/wiki/Nissan_350Z ; https://www.auto-data.net/en/nissan-350z-z33-3.5-i-v6-24v-283hp-568 ; https://my350z.com/forum/2003-2009-nissan-350z/1329-august-car-and-driver.html ; https://www.machinedesign.com/archive/2003-nissan-350z-pure-sports-car

## 3. Toyota Supra RZ / Turbo A80 (1993-1998, 2JZ-GTE, V160 Getrag 6MT)
| Item | Value |
|---|---|
| Mass / front weight | JDM RZ 1,490 kg (tc-v, j-pn), 1,510 kg in some listings; US Turbo 6MT 1,565 kg / 53 % (turbo) |
| Wheelbase / track F-R | 2,550 mm / 1,520-1,525 mm |
| CG height / frontal area | 0.47 m est. / 1.96 m^2 est. |
| Drivetrain / diff | RWD / Torsen LSD (JDM RZ 1-way, US 2-way) |
| Tyres F / R | JDM RZ 225/50ZR16 / 245/50ZR16; US Turbo 235/45ZR17 / 255/40ZR17 |
| Power | JDM 280 PS @ 5,600 rpm; US 325 PS (239 kW) @ 5,600; EU 330 PS |
| Torque | JDM 431 Nm (44.0 kgm) @ 3,600 rpm; US 427 Nm @ 4,000; EU 441 Nm |
| Redline / limiter | unverified |
| Gears 1-6 | 3.827 / 2.360 / 1.685 / 1.312 / 1.000 / 0.793 |
| Final drive | JDM RZ 3.266; US 6MT 3.133 (code B07D, model not named by source) |
| Cd | 0.32 (turbo, without rear wing) |
| 0-100 / 0-200 km/h | C/D 0-60 mph 4.6 s (1993) / 0-200 unverified |
| 100-0 braking / skidpad | C/D 70-0 mph 149 ft = 45 m (1997); 161 ft in C/D 1993 comparo / 0.95 g (200 ft), 0.98 g (300 ft, R&T) |
| Top speed | 250 km/h limited (257 tested); JDM 180 km/h limited |
Sources: https://www.tc-v.com/specifications/toyota/supra/rz_mt_3.0/19080/ ; https://www.j-pn.co.uk/jdm-auto-data-listing/Toyota-Supra-RZ-(E-JZA80)/695/ ; https://en.wikipedia.org/wiki/Toyota_Supra ; https://grannasracing.com/blog/technical-2/toyota-supra-mkiv-jza80-differential-info-12 ; https://clublexus.com/forums/performance-and-maintenance/332968-r154-vs-w58-gear-ratios.html ; https://autos.yahoo.com/1993-toyota-supra-turbo-takes-154600457.html ; https://autos.yahoo.com/2020-toyota-supra-vs-1994-130500353.html ; https://autozine.org/Archive/Toyota/classic/Supra.html

## 4. Mitsubishi Lancer Evolution VIII GSR (2003, JDM CT9A, 4G63T, 6MT, ACD + Super AYC)
| Item | Value |
|---|---|
| Mass / front weight | 1,410 kg (JDM GSR 6MT); US 5MT 1,445 kg (cars-data) / front % unverified (~59 est.) |
| Wheelbase / track F-R | 2,625 mm / 1,515-1,515 mm |
| CG height / frontal area | 0.53 m est. / 2.18 m^2 est. |
| Drivetrain / diff | AWD, ACD centre (nominal 50:50, unverified) / front helical LSD, rear Super AYC (planetary, 2x torque transfer vs AYC) |
| Tyres F / R | 235/45ZR17 / 235/45ZR17 |
| Power | 280 PS @ 6,500 rpm (US car 271 hp) |
| Torque | 392 Nm (40.0 kgm) @ 3,500 rpm (400 Nm is the later MR) |
| Redline / limiter | unverified |
| Gears 1-6 | 2.909 / 1.944 / 1.434 / 1.100 / 0.868 / 0.693 (5MT: 2.785 / 1.950 / 1.444 / 1.096 / 0.825, goo-net snippet) |
| Final drive | 4.583 (5MT 4.529) |
| Cd | unverified |
| 0-100 / 0-200 km/h | US car 5.1 s (Wikipedia); 6.1 s (cars-data); SCC 0-60 mph 5.3 s / 0-200 unverified |
| 100-0 braking / skidpad | SCC 60-0 mph 106 ft = 32 m (US car, 2nd-hand) / 0.95 g, 200 ft (SCC, 2nd-hand) |
| Top speed | UK 157 mph = 253 km/h limited (PistonHeads, FQ-300 note); US car 245 km/h (cars-data) |
Sources: https://www.tc-v.com/specifications/Mitsubishi/Lancer%20Evolution%20VIII/GSR_4WD_MT_2.0/24882/ ; https://j-garage.com/mitsubishi/evoct9aspec2.html ; https://en.wikipedia.org/wiki/Mitsubishi_Lancer_Evolution ; https://cars-data.com/en/mitsubishi/lancer-evolution/2003/viii--31914/specs ; https://www.pistonheads.com/road-tests/mitsubishi/evo-viii-fq-300/7002 ; https://www.goo-net-exchange.com/catalog/MITSUBISHI__LANCER/10002346 ; https://www.gtplanet.net/forum/threads/sport-compact-car-of-the-year-for-2004.39015/latest

## 5. Mazda RX-7 FD3S (1992-1995, JDM Type R / US R1, 13B-REW, 5MT)
| Item | Value |
|---|---|
| Mass / front weight | 1,260 kg (1992 JDM Type R); UK car ~1,300 kg (AMS) / 50 % (MotorMatchup, US 1995); 48 % (Motor Sport, UK car) |
| Wheelbase / track F-R | 2,425 mm / 1,460-1,460 mm |
| CG height / frontal area | 0.45 m est. / 1.84 m^2 est. |
| Drivetrain / diff | RWD / Torsen LSD |
| Tyres F / R | 225/50ZR16 / 225/50ZR16 |
| Power | JDM 255 PS @ 6,500 rpm (US 255 hp SAE; EU 240 PS) |
| Torque | 294 Nm (217 lb-ft) @ 5,000 rpm |
| Redline / limiter | 7,000 rpm red line (Motor Sport, UK car) |
| Gears 1-5 | 3.483 / 2.015 / 1.391 / 1.000 / 0.719 |
| Final drive | 4.100 |
| Cd | 0.29 (MotorMatchup); Motor Sport OCR "0.3x" |
| 0-100 / 0-200 km/h | 0-60 mph 4.9 s (rx7.net.nz, trim unstated); UK test just over 6 s / 0-200 unverified |
| 100-0 braking / skidpad | unverified / unverified |
| Top speed | 252 km/h (rx7.net.nz); 155 mph = 250 km/h (Motor Sport) |
Sources: https://www.rx7.net.nz/jpnspc.htm ; https://en.wikipedia.org/wiki/Mazda_RX-7 ; https://www.auto-motor-und-sport.de/test/mazda-rx-7-1992/technische-daten/ ; https://www.motorsportmagazine.com/archive/article/march-1993/50/road-test/ ; https://www.motormatchup.com/catalog/Mazda/RX_7/1995/Base-2DR-Coupe

## 6. Volkswagen Golf IV GTI 1.8T 180 PS (2001-2003, 6MT 02M)
| Item | Value |
|---|---|
| Mass / front weight | 1,279 kg DIN, 1,354 kg EU / front % unverified (~61 est.) |
| Wheelbase / track F-R | 2,511 mm / 1,513-1,494 mm |
| CG height / frontal area | 0.55 m est. / 2.12 m^2 est. |
| Drivetrain / diff | FWD / open diff (type unverified) |
| Tyres F / R | 225/40R18 / 225/40R18 (as listed; smaller wheels also sold) |
| Power | 180 PS (132 kW) @ 5,500 rpm |
| Torque | 235 Nm @ 1,950 rpm |
| Redline / limiter | unverified |
| Gears 1-6 | 3.357 / 2.087 / 1.469 / 1.150 / 0.935 / 0.763 (5th/6th rescaled to the 3.944 final; raw 1.194 / 0.975 on 3.087) |
| Final drive | 3.944 (gears 1-4) / 3.087 (gears 5-6); gearbox code FML |
| Cd | 0.34 (Autozine: R32 "lowered from 0.34 to 0.32") |
| 0-100 / 0-200 km/h | 7.9 s / unverified |
| 100-0 braking / skidpad | unverified / unverified |
| Top speed | 222-223 km/h |
Sources: https://www.auto-data.net/en/volkswagen-golf-iv-1.8-t-20v-180hp-8666 ; https://zeperfs.com/it/fiche744-vw-golf-iv-gti.htm ; https://workshop-manuals.com/volkswagen/golf-mk4/power_transmission/5_and_6-speed_manual_gearbox_02m/technical_data/gearbox_identification/identification_code_assembly_allocation_ratios_capacities/ ; https://blog.autozine.org/Archive/Volkswagen/old/Golf_Mk4.html ; https://cars-data.com/en/volkswagen/golf/mk4/1-8-5v-turbo-gti-180hp--26047/specs

## 7. BMW 535d Touring E61 (2005-2007, M57 twin-turbo, 272 PS, 6-speed automatic)
| Item | Value |
|---|---|
| Mass / front weight | 1,760 kg (autodata1); 1,830 kg (ultimatespecs, likely EU) / Touring unverified (E60 saloon 52.5 %, carbaze) |
| Wheelbase / track F-R | 2,886 mm / 1,558-1,581 mm |
| CG height / frontal area | 0.56 m est. / 2.34 m^2 est. |
| Drivetrain / diff | RWD / open rear diff (unverified) |
| Tyres F / R | 225/50R17 / 225/50R17 (base) |
| Power | 272 PS (200 kW) @ 4,400 rpm (ultimatespecs); 4,000 rpm (autodata1) |
| Torque | 560 Nm @ 2,000 rpm |
| Redline / limiter | unverified |
| Gears 1-6 | 4.171 / 2.340 / 1.521 / 1.143 / 0.867 / 0.691 (ZF 6HP26 family; 535d fitment unverified) |
| Final drive | 2.56 (carbaze, E60 535d saloon); BMW press kit gives 2.647 for the later 286 PS car |
| Cd | 0.30 (Touring, ultimatespecs); E60 saloon 0.28 (carbaze) |
| 0-100 / 0-200 km/h | 6.6 s / unverified |
| 100-0 braking / skidpad | unverified / unverified |
| Top speed | 250 km/h (limited) |
Sources: https://www.autodata1.com/en/car/bmw/5er/5er-touring-e61-535d-272-hp ; https://ultimatespecs.com/car-specs/BMW/53689/BMW-E61-5-Series-Touring-535d.html ; https://carbaze.com/car-2742/bmw-535d-e60 ; https://en.wikipedia.org/wiki/ZF_6HP_transmission ; https://www.press.bmwgroup.com/global/article/attachment/T0143206EN/224280

## 8. BMW M3 E46 coupe (2000-2006, S54, 6MT Getrag 420G)
| Item | Value |
|---|---|
| Mass / front weight | 1,495 kg DIN, 1,570 kg EU; 1,550-1,565 kg (FCP, Wikipedia) / 50 % (australiancar.reviews, 2nd-hand) |
| Wheelbase / track F-R | 2,731 mm (Wikipedia 2,720) / 1,508-1,525 mm |
| CG height / frontal area | 0.49 m est. / 2.07 m^2 est. |
| Drivetrain / diff | RWD / LSD (ZePerfs); M Variable Differential Lock type unverified |
| Tyres F / R | 225/45R18 / 255/40R18 |
| Power | 343 PS (252 kW) @ 7,900 rpm (US 333 hp) |
| Torque | 365 Nm @ 4,900 rpm |
| Redline / limiter | 8,000 rpm |
| Gears 1-6 | 4.227 / 2.528 / 1.669 / 1.226 / 1.000 / 0.828 |
| Final drive | 3.62 (Noakes); 3.64 (FCP Euro) |
| Cd | 0.32 (auto-data) |
| 0-100 / 0-200 km/h | 5.2 s (BMW claim); C/D 0-60 mph 4.5 s, R&T 4.7 s (2nd-hand) / 0-200 unverified |
| 100-0 braking / skidpad | unverified / unverified |
| Top speed | 250 km/h (limited) |
Sources: https://www.auto-data.net/en/bmw-m3-coupe-e46-3.2i-24v-343hp-9872 ; https://zeperfs.com/en/fiche108-bmw-m3.htm ; https://en.wikipedia.org/wiki/BMW_M3 ; https://www.fcpeuro.com/blog/the-definitive-bmw-e46-m3-buyers-guide ; https://www.andrewnoakes.com/blog/things-you-didn-t-know-about-the-e46-m3.html ; https://www.australiancar.reviews/?p=53194 ; https://www.topspeed.com/cars/bmw/2001-2003-bmw-m3-e46-ar1376.html
