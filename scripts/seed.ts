/**
 * Fills the database with plausible sample data: `pnpm db:seed`.
 *
 * For development and demos. It never touches an existing row: vehicles and
 * drivers are added only if the list is empty, and practices are skipped
 * entirely when there is already one, so running it twice does not pile up
 * duplicates. `--reset` deletes the sample practices first.
 *
 * Tax codes are computed with the real `computeTaxCode`, so every practice
 * passes validation when reopened in the form.
 */
import Database from "better-sqlite3";

import { comuneByCode, provinciaOf } from "../src/lib/comuni";
import { computeTaxCode } from "../src/lib/tax-code";

const file = process.env.DATABASE_PATH ?? "./data/funeral.db";
const reset = process.argv.includes("--reset");

const db = new Database(file);
db.pragma("journal_mode = WAL");

const OWNER = {
  ownerFirstName: "Mario",
  ownerMiddleName: "F.",
  ownerLastName: "Rossi",
  ownerCompanyName: "OO.FF. Rossi Mario",
  ownerCompanyCity: "San Severo",
  ownerCity: "San Severo",
  ownerCityName: "San Severo",
};

const VEHICLES = [
  { name: "Mercedes Vito", plate: "FG123AB" },
  { name: "Fiat Ducato", plate: "GA456CD" },
  { name: "Mercedes Classe E", plate: "FG789EF" },
];

const DRIVERS = [
  { name: "Giuseppe Verdi" },
  { name: "Antonio Russo" },
  { name: "Michele Costa" },
];

/**
 * The cadastral code drives both the tax code and the birth municipality, so
 * the two always agree — a hand-written pair drifts apart as soon as one of the
 * two is edited.
 */
type Person = {
  firstName: string;
  lastName: string;
  isFemale: boolean;
  birthDate: string;
  /** Birth municipality, spelled out so the cadastral code can be checked. */
  birthCity: string;
  birthCode: string;
  residenceCity: string;
  residenceAddress: string;
  deathDate: string;
  deathTime: string;
  deathCity: string;
  deathPlace: string;
  transportDate: string;
  transportTime: string;
  permitDate: string;
  church: string;
  destinationCity: string;
  cemetery: string;
};

const PEOPLE: Person[] = [
  {
    firstName: "Antonietta", lastName: "Russo", isFemale: true,
    birthDate: "1934-11-02", birthCity: "San Severo", birthCode: "I158",
    residenceCity: "San Severo", residenceAddress: "Via Fortore 44",
    deathDate: "2026-07-28", deathTime: "05:20",
    deathCity: "San Severo", deathPlace: "Abitazione",
    transportDate: "2026-07-29", transportTime: "10:00", permitDate: "2026-07-28",
    church: "Chiesa di San Severino Abate",
    destinationCity: "San Severo", cemetery: "Cimitero Comunale",
  },
  {
    firstName: "Vincenzo", lastName: "Di Maio", isFemale: false,
    birthDate: "1941-06-17", birthCity: "Foggia", birthCode: "D643",
    residenceCity: "Foggia", residenceAddress: "Corso Garibaldi 12",
    deathDate: "2026-07-30", deathTime: "22:45",
    deathCity: "Foggia", deathPlace: "Ospedali Riuniti",
    transportDate: "2026-07-31", transportTime: "08:30", permitDate: "2026-07-30",
    church: "Cattedrale di Foggia",
    destinationCity: "Lucera", cemetery: "Cimitero di Lucera",
  },
  {
    firstName: "Maria Grazia", lastName: "Fiore", isFemale: true,
    birthDate: "1929-02-14", birthCity: "Lucera", birthCode: "E716",
    residenceCity: "Lucera", residenceAddress: "Via Federico II 3",
    deathDate: "2026-08-01", deathTime: "13:10",
    deathCity: "Lucera", deathPlace: "Casa di riposo Villa Serena",
    transportDate: "2026-08-02", transportTime: "16:00", permitDate: "2026-08-01",
    church: "Chiesa del Carmine",
    destinationCity: "Lucera", cemetery: "Cimitero di Lucera",
  },
  {
    firstName: "Pasquale", lastName: "Marino", isFemale: false,
    birthDate: "1948-09-30", birthCity: "Apricena", birthCode: "A339",
    residenceCity: "Apricena", residenceAddress: "Via Sannicandro 87",
    deathDate: "2026-08-03", deathTime: "07:05",
    deathCity: "San Severo", deathPlace: "Ospedale Teresa Masselli Mascia",
    transportDate: "2026-08-04", transportTime: "09:15", permitDate: "2026-08-03",
    church: "Chiesa Madre di Apricena",
    destinationCity: "Apricena", cemetery: "Cimitero di Apricena",
  },
  {
    firstName: "Rosa", lastName: "Colangelo", isFemale: true,
    birthDate: "1937-04-08", birthCity: "San Severo", birthCode: "I158",
    residenceCity: "San Severo", residenceAddress: "Viale Due Giugno 21",
    deathDate: "2026-08-05", deathTime: "18:40",
    deathCity: "San Severo", deathPlace: "Abitazione",
    transportDate: "2026-08-06", transportTime: "11:30", permitDate: "2026-08-05",
    church: "Chiesa di Santa Maria della Pietà",
    destinationCity: "Torremaggiore", cemetery: "Cimitero di Torremaggiore",
  },
  {
    firstName: "Nicola", lastName: "Cassano", isFemale: false,
    birthDate: "1952-12-21", birthCity: "Torremaggiore", birthCode: "L273",
    residenceCity: "Torremaggiore", residenceAddress: "Via Marconi 9",
    deathDate: "2026-08-06", deathTime: "02:15",
    deathCity: "Foggia", deathPlace: "Ospedali Riuniti",
    transportDate: "2026-08-07", transportTime: "07:45", permitDate: "2026-08-06",
    // Left empty on purpose: the church is optional, and a practice without one
    // has to look right too.
    church: "",
    destinationCity: "Napoli", cemetery: "Cimitero di Poggioreale",
  },
];

function seedOwner() {
  const existing = db.prepare("SELECT id FROM owner WHERE id = 1").get();
  if (existing) return "already configured";

  db.prepare(
    `INSERT INTO owner (id, owner_first_name, owner_middle_name, owner_last_name,
       owner_company_name, owner_company_city, owner_city, owner_city_name)
     VALUES (1, @ownerFirstName, @ownerMiddleName, @ownerLastName,
       @ownerCompanyName, @ownerCompanyCity, @ownerCity, @ownerCityName)`,
  ).run(OWNER);
  return "inserted";
}

/** Adds the sample rows only when the list is empty, and returns the ids. */
function seedList(
  table: "vehicles" | "drivers",
  rows: { name: string; plate?: string }[],
): number[] {
  const ids = db
    .prepare(`SELECT id FROM ${table} ORDER BY id`)
    .all() as { id: number }[];
  if (ids.length) return ids.map((r) => r.id);

  const insert =
    table === "vehicles"
      ? db.prepare("INSERT INTO vehicles (name, plate) VALUES (@name, @plate)")
      : db.prepare("INSERT INTO drivers (name) VALUES (@name)");

  const inserted: number[] = [];
  for (const row of rows) {
    inserted.push(Number(insert.run(row).lastInsertRowid));
  }
  return inserted;
}

function seedPractices() {
  const count = (
    db.prepare("SELECT COUNT(*) AS n FROM practices").get() as { n: number }
  ).n;
  if (count > 0) return `${count} already present, left alone`;

  const insert = db.prepare(
    `INSERT INTO practices (
       person_first_name, person_last_name, person_sex, person_tax_code,
       person_birth_date, person_birth_city, person_residence_city,
       person_residence_address, person_death_date, person_death_time,
       person_death_city, person_death_place, transport_date, transport_time,
       transport_permit_date, funeral_church, destination_city,
       destination_province, destination_cemetery, vehicle_id, vehicle_plate,
       driver_id, driver_name
     ) VALUES (
       @firstName, @lastName, @sex, @taxCode,
       @birthDate, @birthCity, @residenceCity,
       @residenceAddress, @deathDate, @deathTime,
       @deathCity, @deathPlace, @transportDate, @transportTime,
       @permitDate, @church, @destinationCity,
       @destinationProvince, @cemetery, @vehicleId, @vehiclePlate,
       @driverId, @driverName
     )`,
  );

  const vehicles = db
    .prepare("SELECT id, plate FROM vehicles ORDER BY id")
    .all() as { id: number; plate: string }[];
  const drivers = db
    .prepare("SELECT id, name FROM drivers ORDER BY id")
    .all() as { id: number; name: string }[];

  let inserted = 0;
  PEOPLE.forEach((p, index) => {
    const comune = comuneByCode(p.birthCode);
    if (!comune) throw new Error(`Codice catastale sconosciuto: ${p.birthCode}`);
    // A wrong code resolves to some other municipality rather than failing, and
    // the practice would open with a birth city nobody typed.
    if (comune.nome !== p.birthCity) {
      throw new Error(
        `${p.birthCode} e' ${comune.nome}, non ${p.birthCity} (${p.lastName})`,
      );
    }

    const taxCode = computeTaxCode({
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate,
      cadastralCode: p.birthCode,
      isFemale: p.isFemale,
    });
    if (!taxCode) throw new Error(`Codice fiscale non calcolabile: ${p.lastName}`);

    const province = provinciaOf(p.destinationCity);
    if (!province) {
      throw new Error(`Provincia non risolvibile: ${p.destinationCity}`);
    }

    // Rotated rather than random, so the same seed always produces the same
    // rows and a screenshot stays comparable.
    const vehicle = vehicles[index % vehicles.length];
    const driver = drivers[index % drivers.length];

    insert.run({
      firstName: p.firstName,
      lastName: p.lastName,
      sex: p.isFemale ? "F" : "M",
      taxCode,
      birthDate: p.birthDate,
      birthCity: comune.nome,
      residenceCity: p.residenceCity,
      residenceAddress: p.residenceAddress,
      deathDate: p.deathDate,
      deathTime: p.deathTime,
      deathCity: p.deathCity,
      deathPlace: p.deathPlace,
      transportDate: p.transportDate,
      transportTime: p.transportTime,
      permitDate: p.permitDate,
      church: p.church,
      destinationCity: p.destinationCity,
      destinationProvince: province,
      cemetery: p.cemetery,
      vehicleId: vehicle?.id ?? null,
      vehiclePlate: vehicle?.plate ?? "",
      driverId: driver?.id ?? null,
      driverName: driver?.name ?? "",
    });
    inserted++;
  });

  return `${inserted} inserted`;
}

if (reset) {
  const removed = db.prepare("DELETE FROM practices").run();
  console.log(`Defunti eliminati: ${removed.changes}`);
}

console.log(`Impresa: ${seedOwner()}`);
console.log(`Autofunebri: ${seedList("vehicles", VEHICLES).length}`);
console.log(`Conducenti: ${seedList("drivers", DRIVERS).length}`);
console.log(`Defunti: ${seedPractices()}`);

db.close();
console.log(`\nDati di esempio pronti in ${file}`);
