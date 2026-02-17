import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getRedis } from '@/lib/redis';
import { parseLocation } from '@/lib/location-parser';
import { Receiver } from '@upstash/qstash';

interface Event {
  title: string;
  description: string;
  time: string;
  date?: string;
  location: string;
  category?: string;
  borough?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  link?: string;
  ticketLink?: string;
  enriched?: boolean;
}

interface EventsResponse {
  success: boolean;
  count: number;
  events: Event[];
  lastFetched: string;
}

const EVENT_URLS = [
  'https://www.nyc.gov/main/events/',
  'https://lu.ma/nyc',
  'https://eventlume.com/things-to-do/new-york',
  'https://secretnyc.co/what-to-do-this-weekend-nyc/',
  'https://www.nycgovparks.org/events/',
  'https://www.nycforfree.co/events',
  'https://ny-event-radar.com',
  // Temporarily disabled - Claude extraction issues:
  // 'https://www.timeout.com/newyork/things-to-do/things-to-do-in-new-york-this-week',
  // Venue-specific sources:
  'https://www.msg.com/beacon-theatre/calendar?venue=beacon-theatre&venues=KovZpZAEAd6A',
  'https://www.thebellhouseny.com/shows',
  'https://www.musichallofwilliamsburg.com/events',
  'https://www.elsewherebrooklyn.com/events',
  'https://wl.eventim.us/BabysAllRightBrooklyn',
  'https://www.saintvitusbar.com/events',
  'https://nationalsawdust.org/events/',
  'https://bk.knittingfactory.com/calendar/',
  'https://www.markethotel.org/calendar#/events',
  'https://www.terminal5nyc.com/events',
  'https://www.boweryballroom.com/events',
  // Additional NYC venues:
  'https://www.bowerypresents.com/venues/brooklyn-steel',
  'https://www.roughtradenyc.com/calendar/',
  'https://www.bowerypresents.com/shows/webster-hall',
  'https://www.brooklynbowl.com/brooklyn/shows/all',
  'https://www.irvingplaza.com/shows',
  'https://sobs.com/events',
  'https://mercuryeastpresents.com/war-saw/',
  'https://www.thegramercytheatre.com/',
  // 'https://www.ticketweb.com/venue/night-club-101-new-york-ny/686683', // Disabled - blocked by bot detection
  // Manhattan venues:
  'https://citywinery.com/new-york-city/events',
  'https://publictheater.org/joes-pub/',
  'https://lpr.com',
  'https://thecuttingroomnyc.com/calendar/',
  'http://thestonenyc.com/calendar.php',
  'https://mercuryeastpresents.com/mercurylounge/',
  'https://www.birdlandjazz.com/calendar/',
  'https://www.thedelancey.com/events',
  'https://berlin.nyc',
  'https://www.arlenesgrocerynyc.com/upcoming-events',
  'https://www.ottosshrunkenhead.com/pages/events.php',
  'https://dromnyc.com/events/',
  'https://www.cafewha.com/calendar',
  'https://www.bathtubginnyc.com/entertainment-nyc/',
  // Brooklyn small venues:
  'https://www.petescandystore.com/calendar/',
  'https://tveyenyc.com/calendar/',
  'https://www.thetinycupboard.com/calendar',
  'https://www.eastvillecomedy.com/calendar',
  'https://www.brooklyncc.com/whats-playing-shows',
  // Manhattan comedy clubs:
  'https://newyorkcomedyclub.com/calendar',
  'https://www.gothamcomedyclub.com/calendar',
  'https://www.westsidecomedyclub.com/calendar',
  // More Brooklyn venues:
  'https://www.barclayscenter.com/events',
  'https://wl.seetickets.us/BabysAllRightBrooklyn',
  'https://www.elsewhere.club/events',
  'https://www.musichallofwilliamsburg.com/calendar/',
  'https://www.houseofyes.org/calendar',
  'https://littlefieldnyc.com/all-shows/',
  'https://www.unionhallny.com/calendar',
  'https://publicrecords.nyc',
  'https://www.kingstheatre.com/events/',
  // Playhouses & Performance Spaces:
  'https://www.symphonyspace.org/events',
  'https://www.bam.org',
  'https://www.nationalsawdust.org/performances',
  'https://www.lincolncenter.org/lincoln-center-at-home/calendar',
  'https://www.carnegiehall.org/Events',
  'https://www.apollotheater.org/ticket-and-events',
  // Jazz Clubs:
  'https://www.villagevanguard.com',
  'https://www.bluenotejazz.com',
  'https://www.smokesjazzclub.com',
  'https://www.jazzmusicnyc.com',
  'https://www.jazz966.org',
  // Queens Venues:
  'https://www.queenstheatre.org/events',
  'https://www.thesidefarm.com/events',
  'https://thekitchenqueens.com',
  // Additional Brooklyn:
  'https://www.brooklynnights.com/events',
  'https://www.bazaar.nyc/calendar',
  // More Manhattan:
  'https://www.sohousenyc.com/events',
  'https://www.cielo-club.com',
  'https://www.parkavenyc.com/events',
  'https://www.marquisclub.net/calendar',
  // Art & Cultural Spaces:
  'https://www.moma.org/calendar',
  'https://www.metmuseum.org/events',
  'https://www.brooklynmuseum.org/calendar',
  'https://www.guggenheim.org/event',
  'https://whitney.org/events',
  'https://www.mcny.org/events',
  'https://www.frick.org/events',
  'https://www.themorgan.org/programs',
  'https://www.newmuseum.org/calendar',
  'https://studiomuseum.org/calendar',
  'https://www.amnh.org/calendar',
  'https://www.nyhistory.org/events',
  // Additional venues (2025-01):
  'https://www.knockdown.center',
  'https://www.thestandnyc.com/shows',
  'https://www.rockwoodmusichall.com',
  'https://www.pioneerworks.org/events',
  'https://www.saintannswarehouse.org',
  'https://www.avant-gardner.com/events',
  'https://www.brooklynparamount.com',
  'https://www.msg.com/calendar',
  'https://www.radiocity.com/events',
  'https://www.foresthillsstadium.com',
  'https://www.sonyhall.com/events',
  'https://comicstriplive.com',
  'https://broadwaycomedyclub.com/shows',
  'https://www.bargemusic.org/concerts',
  // Bushwick/Williamsburg indie venues:
  'https://www.thesultanroom.com/calendar',
  'https://www.goldsoundsbar.com',
  'https://www.alphavillebar.com',
  'https://www.tveyenyc.com/calendar',
  'https://www.brooklynmade.com/calendar',
  'https://www.goodroombk.com',
  'https://www.silobrooklyn.com',
  'https://www.gutterbarbowl.com/williamsburg',
  'https://skinnydennisbrooklyn.com',
  'https://www.fnlbk.com/upcoming',
  'https://hankssaloon.com/calendar/',
  'https://www.cmoneverybody.com/events',
  // Manhattan dance/electronic:
  'https://www.marqueeclub.net/calendar',
  'https://www.standardhotels.com/new-york/features/le-bain',
  'https://www.nebula.nyc/events',
  // Queens venues:
  'https://www.ubsarena.com/events',
  'https://www.flushingtownhall.org/events',
  'https://www.socratessculpturepark.org/event',
  'https://www.thetranspecos.com/',
  'https://www.footlightunderground.com/',
  // College/University Events & Talks:
  'https://events.nyu.edu/',
  'https://nyuskirball.org/events/',
  'https://events.columbia.edu/',
  'https://events.cuny.edu/',
  'https://cooper.edu/events-and-exhibitions/events',
  'https://events.newschool.edu/',
  // Manhattan comedy & performance spaces:
  'https://www.theboweryelectric.com/calendar/',
  'https://magnettheater.com/',
  'https://ucbcomedy.com/',
  'https://thepit-nyc.com/calendar/',
  'https://arsnovanyc.com/',
  'https://caveat.nyc/events',
  // Jazz clubs:
  'https://www.bluenotejazz.com/nyc/shows/',
  'https://www.smallslive.com/',
  'https://www.smallslive.com/mezzrow/',
  'https://smokejazz.com/',
  'https://www.thedjangonyc.com/events/',
  'https://www.theiridium.com/events',
  // Music hall:
  'https://www.chelseamusichall.com/',
  // Bars & nightlife with events:
  'https://thedeadrabbit.com/event/',
  'https://arthurstavern.nyc/events/',
  'https://paddyreillysmusicbar.us/live-music-at-paddy-reillys-music-bar/',
  'https://www.parksidelounge.nyc/calendar',
  'https://clubcummingnyc.com',
  'https://www.whitehorsetavern1880.com/events',
  'https://bitterend.com/',
  // Performance venues:
  'https://www.thetownhall.org/events',
  'https://www.frauncestavernmuseum.org/events-calendar',
  // Lower East Side music venues:
  'https://pianosnyc.com/SHOWS',
  'https://nublu.net/program',
  // Cabaret & supper clubs:
  'https://www.theduplex.com/upcoming',
  'https://shows.donttellmamanyc.com/',
  'https://54below.org/calendar/',
  'https://jazz.org/dizzys/',
  // Nightclubs & dance venues:
  'https://nowadays.nyc/',
  'https://taogroup.com/venues/marquee-new-york/events/',
  // Greenwich Village jazz & blues:
  'https://www.zincbar.com/calendar/',
  'https://www.terrablues.com/calendar',
  'https://thevillageunderground.com',
  // Unique performance spaces:
  'https://sidgolds.com/new-york/new-york-events/',
  'https://www.slipperroom.com/calendar',
  'https://www.pangeanyc.com/',
  'https://mercuryeastpresents.com/boweryballroom/',
  // Harlem venues:
  'https://shrinenyc.com/',
  // Google Places API discovered Manhattan venues:
  'https://rooftopatpier17.com/concerts/', // Pier 17
  'https://gibneydance.org/calendar/', // Gibney Dance
  'https://www.sourmousenyc.com/events', // Sour Mouse
  'https://www.comedycellar.com/', // Comedy Cellar
  'https://metrograph.com/events/', // Metrograph
  'https://www.loreleynyc.com/events', // Loreley Beer Garden
  'https://www.tenement.org/events/', // Tenement Museum
  'https://elizabethstreetgarden.com/calendar', // Elizabeth Street Garden
  'https://www.icp.org/events', // Intl Center of Photography
  'https://mjhnyc.org/events/', // Museum of Jewish Heritage
  'https://www.eldridgestreet.org/events', // Museum at Eldridge Street
  'https://hudsonriverpark.org/visit/events/', // Hudson River Park
  'https://www.museumofsex.com/events/', // Museum of Sex
  'https://www.themuseumofbroadway.com/calendar', // Museum of Broadway
  'https://momath.org/calendar/', // National Museum of Mathematics
  'https://www.fitnyc.edu/museum/events/', // Museum at FIT
  'https://japansociety.org/events', // Japan Society
  'https://madmuseum.org/calendar', // Museum of Arts and Design
  'https://www.artechouse.com/upcoming/', // ARTECHOUSE NYC
  'https://www.grandcentralterminal.com/events-page/', // Grand Central Terminal
  'https://javitscenter.com/calendar/', // Javits Center
  'https://www.rockefellercenter.com/events/', // Rockefeller Center
  'https://intrepidmuseum.org/events/calendar', // Intrepid Museum
  'https://www.davidhkochtheater.com/tickets-and-events/calendar', // David H. Koch Theater
  'https://www.ailey.org/calendar', // Alvin Ailey
  'https://www.nyphil.org/concerts-tickets/', // NY Philharmonic / David Geffen Hall
  'https://www.lct.org/shows/', // Lincoln Center Theater
  'https://www.roundabouttheatre.org/get-tickets/find-tickets', // Studio 54 / Roundabout Theatre
  'https://www.cooperhewitt.org/events', // Cooper Hewitt
  'https://asiasociety.org/new-york/events', // Asia Society
  'https://elmuseo.org/calendar/', // El Museo del Barrio
  'https://hispanicsociety.org/whats-on/events-calendar/', // Hispanic Society
  'https://www.millertheatre.com/events', // Miller Theatre
  'https://native125th.com/upcoming-events/', // Native Harlem
  'https://hsanyc.org/calendar/', // Harlem School of the Arts
  'https://citycollegecenterforthearts.org/gca/events', // Aaron Davis Hall
  'https://www.harlemstage.org/events', // Harlem Stage Gatehouse
  'https://italianacademy.columbia.edu/events', // Italian Academy, Columbia
  'https://www.comedyinharlem.com/events', // Comedy In Harlem
  'https://jmih.org/event/', // National Jazz Museum in Harlem
  'https://www.lenfest.arts.columbia.edu/calendar', // Lenfest Center for the Arts
  'https://www.dwyerculturalcenter.org/upcoming-events-gww8x', // Dwyer Cultural Center
  'https://theshabazzcenter.org/events/', // Malcolm X & Betty Shabazz Center
  'https://morrisjumel.org/programs-events/', // Morris-Jumel Mansion
  'https://www.artsandletters.org/events', // American Academy of Arts & Letters
  'https://www.wordupbooks.com/events/calendar', // Word Up Community Bookshop
  'https://jazzfoundation.org/events', // Jazz Foundation of America
  'https://www.abronsartscenter.org/calendar', // Abrons Arts Center
  'https://theseaport.nyc/events/', // The Seaport
  'https://randallsisland.org/events', // Randalls Island
  'https://www.kenteroyalgallery.com/events-1', // Kente Royal Gallery
  'https://www.macyartgallery.com/calendar', // Macy Art Gallery
  'https://ihouse-nyc.org/events', // International House
  'https://eagle-ny.com/calendarofevents/', // Eagle NYC
  'https://www.thedl-nyc.com/events', // The DL
  'https://www.mrpurplenyc.com/upcoming-events/', // Mr. Purple
  'https://slate-ny.com/events/', // Slate NYC
  'https://moxytimessquare.com/calendar/', // Magic Hour Rooftop
  'https://www.lagosnyc.com/upcoming-events/', // Lagos TSQ
  'https://ascentloungenyc.com/events/', // Ascent Lounge
  'https://www.neuegalerie.org/tickets', // Neue Galerie
  'https://victorscafe.com/music-and-live-performances-at-victors-cafe/', // Victor's Cafe
  'https://www.eataly.com/us_en/classes-and-events', // Eataly NYC
  'https://cornersocialnyc.com/dj-lineup/', // Corner Social
  'https://sofritony.com/events/', // Sofrito
  'https://230-fifth.com/events/', // 230 Fifth Rooftop
  'https://www.oldmates.com/upcoming-events/', // Old Mates Pub
  // Google Places API discovered Brooklyn venues:
  'https://www.union-pool.com/calendar', // Union Pool
  'https://www.cafeerzulie.com/events', // Cafe Erzulie
  'https://www.sleepwalk.nyc/events', // Sleepwalk
  'http://www.bkarthaus.com/calendar', // Brooklyn Art Haus
  'https://brooklynmusickitchen.com/calendar/', // Brooklyn Music Kitchen
  'https://www.si-bk.com/shows', // Superior Ingredients
  'https://www.deadletterno9.com/events', // Dead Letter No. 9
  'https://www.secondcity.com/shows/new-york', // The Second City New York
  'https://www.signalnyc.club/club-calendar', // Signal
  'http://www.brooklyncomedy.com/show-schedule', // Brooklyn Comedy Collective (BCC)
  'http://www.cprnyc.org/event-calendar', // CPR - Center for Performance Research
  'https://cityreliquary.org/category/events/', // The City Reliquary Museum
  'http://www.ampmgallery.com/events', // AM:PM Gallery
  'https://www.pratt.edu/events', // Pratt Institute
  'https://www.thebrooklynmonarch.com/shows', // The Brooklyn Monarch
  'https://www.barbesbrooklyn.com/events', // Barbes
  'https://roulette.org/calendar/', // Roulette Intermedium
  'https://tfana.org/performance-calendar', // Theatre for a New Audience
  'https://www.wildeastbrewing.com/events', // Wild East Brewing Co.
  'https://www.theratnyc.com/event-list', // The Rat NYC
  'https://theowl.nyc/calendar/', // The Owl Music Parlor
  'https://www.bax.org/events/', // Brooklyn Arts Exchange (BAX)
  'https://shapeshifterlab.com/showcase/', // ShapeShifter Lab
  'http://www.art-newyork.org/calendar', // Alliance of Resident Theatres
  'https://thebillieholidaytheatre.org/events/', // The Billie Holiday Theatre
  'https://denofsplendor.com/events/', // Den of Splendor
  'https://theoldstonehouse.org/events/', // Old Stone House of Brooklyn
  'http://www.urbanglass.org/events', // UrbanGlass
  'http://blankforms.org/events-and-exhibitions', // Blank Forms
  'http://www.fivemyles.org/calendar', // Five Myles Gallery
  'https://bbg.org/visit/calendar', // Brooklyn Botanic Garden
  'https://www.prospectpark.org/events/', // Prospect Park
  'https://shop.threesbrewing.com/pages/events-list', // Threes Brewing
  'https://www.franklinparkbk.com/events/', // Franklin Park
  'https://bricartsmedia.org/events/calendar/', // BRIC / Lena Horne Bandshell
  'http://ornithologyjazzclub.com/brooklyn-bushwick-williamsburg-ornithology-jazz-club-events', // Ornithology Jazz Club
  'https://theredpavilion.com/calendar', // The Red Pavilion
  'https://www.thebroadway.nyc/shows', // The Broadway
  'https://companyxiv.com/about/shows/', // Theatre XIV by Company XIV
  'http://www.lot45bushwick.com/lot45-events', // Lot45
  'http://www.jupiterdisco.com/events', // Jupiter Disco
  'https://www.weeksvillesociety.org/events/', // Weeksville Heritage Center
  'http://selva.nyc/events', // Selva
  'http://www.the-living-gallery.com/Future-Events---Exhibitions.html', // The Living Gallery
  'https://www.timeoutmarket.com/time-out-market-new-york/events-groups', // Time Out Market New York
  'https://dekalbmarkethall.com/events', // Dekalb Market Hall
  'https://smorgasburg.com/new-events', // Smorgasburg
  'https://radegasthall.com/events-2/', // Radegast Hall & Biergarten
  'http://www.geminiandscorpio.com/events.html', // Gemini and Scorpio Loft
  'https://www.superfine.nyc/events/', // Superfine
  'http://333lounge.com/weekly-events/', // 333 Lounge
  'https://brooklynstorehouse.com/whats-on/', // Brooklyn Storehouse
  'https://www.mofad.org/buy-tickets', // Museum of Food and Drink (MOFAD)
  'https://lesbianherstoryarchives.org/calendar/', // Lesbian Herstory Archives
  'http://www.airgallery.org/events', // A.I.R. Gallery
  'https://essencebar.com/event-page', // Essence Bar and Grill
  'https://www.headhi.net/events-2026', // Head Hi
  'https://www.drinkbk.com/events', // Drink Lounge & Cafe
  'http://www.440gallery.com/events', // 440 Gallery
];

const CACHE_KEY = 'nyc_events';
const STATUS_KEY = 'scraping_status';

// Helper function to verify QStash signature
async function verifyQStashSignature(request: NextRequest): Promise<boolean> {
  // TODO: Implement proper signature verification
  // For now, allow all requests to get scraping working
  console.log('[API] Signature verification temporarily disabled');
  return true;
}

// Helper function to infer actual date from day-of-week references
function inferDateFromDayOfWeek(timeString: string): string {
  if (!timeString) return timeString;

  // Check if the time string contains only day-of-week without a month name
  const hasMonthName = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(timeString);

  if (hasMonthName) {
    // Already has a proper date, return as-is
    return timeString;
  }

  // Map day names to numbers (0 = Sunday, 6 = Saturday)
  const dayMap: Record<string, number> = {
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6
  };

  // Try to find a day-of-week name
  const lowerTime = timeString.toLowerCase();
  let targetDayIndex = -1;
  let dayName = '';

  for (const [name, index] of Object.entries(dayMap)) {
    if (lowerTime.includes(name)) {
      targetDayIndex = index;
      dayName = name;
      break;
    }
  }

  if (targetDayIndex === -1) {
    // No day-of-week found, return as-is
    return timeString;
  }

  // Get current date in Eastern Time
  const nowUTC = new Date();
  const nowET = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentDayIndex = nowET.getDay();

  // Calculate days until target day (looking forward)
  let daysUntil = targetDayIndex - currentDayIndex;
  if (daysUntil < 0) {
    daysUntil += 7; // Next week
  }
  if (daysUntil === 0 && lowerTime.includes('next')) {
    daysUntil = 7; // Next week if "next" is mentioned
  }

  // Create the target date
  const targetDate = new Date(nowET);
  targetDate.setDate(targetDate.getDate() + daysUntil);

  // Format as "Month Day"
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[targetDate.getMonth()];
  const day = targetDate.getDate();

  // Replace the day name with the actual date
  const regex = new RegExp(dayName + '\\s*,?\\s*', 'gi');
  return timeString.replace(regex, `${month} ${day}, `);
}

// Helper function to check if an event is past/old
function isEventPast(event: Event): boolean {
  if (!event.time) return false; // Keep events with no time

  const timeString = event.time.toLowerCase();

  // Filter out "ongoing" events - they lack specific dates
  if (timeString.includes('ongoing') || timeString.includes('permanent')) {
    return true;
  }

  // Try to parse the date from the time string
  const months: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
    'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };

  let month: number | null = null;
  let day: number | null = null;

  // Find month
  for (const [monthName, monthNum] of Object.entries(months)) {
    if (timeString.includes(monthName)) {
      month = monthNum;
      // Try to find day number after month
      const afterMonth = timeString.substring(timeString.indexOf(monthName) + monthName.length);
      const dayMatch = afterMonth.match(/\d+/);
      if (dayMatch) {
        day = parseInt(dayMatch[0]);
      }
      break;
    }
  }

  if (month === null || day === null) {
    return false; // Can't parse date, keep the event
  }

  // Get current time in Eastern Time (America/New_York)
  const nowUTC = new Date();
  const nowET = new Date(nowUTC.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentYear = nowET.getFullYear();

  // Construct the event date in Eastern Time
  const eventDate = new Date(currentYear, month, day);

  // If event date is in the past (before today in ET), consider it old
  const todayET = new Date(nowET);
  todayET.setHours(0, 0, 0, 0); // Start of today

  return eventDate < todayET;
}

// Helper function to validate/infer a structured date field from an event
function inferDateField(event: { date?: string; time?: string }): string | undefined {
  // If date is already valid YYYY-MM-DD, return it
  if (event.date && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
    return event.date;
  }

  // Try to parse from time string as fallback
  if (!event.time) return undefined;

  const months: Record<string, number> = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };

  const lowerTime = event.time.toLowerCase();
  let month: number | null = null;
  let day: number | null = null;

  for (const [monthName, monthNum] of Object.entries(months)) {
    if (lowerTime.includes(monthName)) {
      month = monthNum;
      const afterMonth = lowerTime.substring(lowerTime.indexOf(monthName) + monthName.length);
      const dayMatch = afterMonth.match(/\d+/);
      if (dayMatch) {
        day = parseInt(dayMatch[0]);
      }
      break;
    }
  }

  if (month === null || day === null) return undefined;

  // Infer year: use current year, roll forward to next year if date is >30 days in the past
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  let year = nowET.getFullYear();
  const candidateDate = new Date(year, month - 1, day);
  const todayET = new Date(nowET);
  todayET.setHours(0, 0, 0, 0);

  if (candidateDate < todayET) {
    const diffDays = (todayET.getTime() - candidateDate.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays > 30) {
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function fetchEventsLogic() {
  console.log('[API] Fetching NYC events');

  try {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!firecrawlApiKey || !anthropicApiKey || !scrapflyApiKey) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    // Get existing events from Redis at the start
    let existingEvents: Event[] = [];
    try {
      const redis = getRedis();
      const cachedData = await redis.get<EventsResponse>(CACHE_KEY);
      if (cachedData) {
        existingEvents = cachedData.events || [];
        console.log(`[API] Found ${existingEvents.length} existing events in cache`);
      }
    } catch (redisError) {
      console.error('[API] Error reading from Redis:', redisError);
    }

    // Helper function to merge and deduplicate events
    const mergeEvents = (existing: Event[], newEvents: Event[]): Event[] => {
      const eventMap = new Map<string, Event>();

      // Add existing events first
      existing.forEach(event => {
        const key = `${event.title.toLowerCase()}|${event.link || event.location}`;
        eventMap.set(key, event);
      });

      // Add new events (will overwrite if duplicate, keeping fresher data)
      newEvents.forEach(event => {
        const key = `${event.title.toLowerCase()}|${event.link || event.location}`;
        eventMap.set(key, event);
      });

      return Array.from(eventMap.values());
    };

    let totalNewEvents = 0;
    const errors: string[] = [];

    // Scrape each URL and save incrementally
    for (let i = 0; i < EVENT_URLS.length; i++) {
      const url = EVENT_URLS[i];
      console.log(`[API] Scraping ${url}`);

      // Update status for current source
      try {
        const redis = getRedis();
        await redis.set(STATUS_KEY, {
          isRunning: true,
          currentSource: url,
          sourcesCompleted: i,
          totalSources: EVENT_URLS.length,
          eventsScraped: totalNewEvents,
          lastUpdate: new Date().toISOString(),
          errors: errors.slice(-5), // Keep last 5 errors
        });
      } catch (statusError) {
        console.error('[API] Error updating status:', statusError);
      }

      try {
        let scrapedContent = '';
        let scraper = '';

        // Try Firecrawl first
        try {
          const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${firecrawlApiKey}`,
            },
            body: JSON.stringify({
              url: url,
              formats: ['markdown', 'html'],
              waitFor: 3000, // Wait 3 seconds for dynamic content to load
              timeout: 30000, // 30 second timeout
            }),
          });

          if (firecrawlResponse.ok) {
            const firecrawlData = await firecrawlResponse.json();
            scrapedContent = firecrawlData.data?.markdown || firecrawlData.data?.html || '';
            if (scrapedContent) {
              scraper = 'Firecrawl';
              console.log(`[API] Firecrawl success for ${url}`);
            }
          } else {
            console.log(`[API] Firecrawl failed for ${url}, status: ${firecrawlResponse.status}`);
          }
        } catch (firecrawlError) {
          console.log(`[API] Firecrawl error for ${url}:`, firecrawlError);
        }

        // If Firecrawl failed or returned no content, try Scrapfly
        if (!scrapedContent) {
          console.log(`[API] Trying Scrapfly for ${url}`);
          try {
            const scrapflyUrl = new URL('https://api.scrapfly.io/scrape');
            scrapflyUrl.searchParams.append('key', scrapflyApiKey);
            scrapflyUrl.searchParams.append('url', url);
            scrapflyUrl.searchParams.append('render_js', 'true');
            scrapflyUrl.searchParams.append('format', 'markdown');
            scrapflyUrl.searchParams.append('asp', 'true'); // Anti-scraping protection

            const scrapflyResponse = await fetch(scrapflyUrl.toString());

            if (scrapflyResponse.ok) {
              const scrapflyData = await scrapflyResponse.json();
              scrapedContent = scrapflyData.result?.content || '';
              if (scrapedContent) {
                scraper = 'Scrapfly';
                console.log(`[API] Scrapfly success for ${url}`);
              }
            } else {
              console.log(`[API] Scrapfly failed for ${url}, status: ${scrapflyResponse.status}`);
            }
          } catch (scrapflyError) {
            console.log(`[API] Scrapfly error for ${url}:`, scrapflyError);
          }
        }

        // If both scrapers failed, skip this URL
        if (!scrapedContent) {
          const errorMsg = `Scrapers failed for ${url.substring(0, 50)}...`;
          console.error(`[API] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        console.log(`[API] Content length from ${url} (via ${scraper}): ${scrapedContent.length} characters`);

        // Use Claude to extract structured event data
        const anthropic = new Anthropic({
          apiKey: anthropicApiKey,
        });

        let response;
        try {
          console.log(`[API] Calling Claude API for ${url}...`);
          response = await anthropic.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: `You are an event extraction system. Extract EVERY SINGLE event from this NYC events page.

For each event, provide:
- title: The event name
- description: Brief description (2-3 sentences max)
- date: The event date in YYYY-MM-DD format (e.g. "2026-02-15"). For multi-day events, use the START date.
- time: FULL date and time (MUST include the MONTH and DAY NUMBER like "November 9" or "Dec 15", plus the time like "7:00 PM". NEVER use day-of-week names like "Saturday" or "Thursday" alone!)
- location: Where it takes place (be specific, include neighborhood or venue name)
- category: Choose ONE category that best fits the event from these options: "Cultural & Arts", "Fitness & Wellness", "Sports & Recreation", "Markets & Shopping", "Community & Volunteering", "Food & Dining", "Holiday & Seasonal", "Professional & Networking", "Educational & Literary"
- link: URL to event page (if available)
- ticketLink: URL to buy tickets (if available)

CRITICAL REQUIREMENTS FOR DATES:
1. ALWAYS use MONTH + DAY format: "November 9", "December 15", "Jan 20"
2. NEVER use ONLY day-of-week names like "Saturday", "Thursday", "Monday"
3. NEVER use relative dates like "Today", "Tomorrow", "This Weekend"
4. If the page shows "Saturday, November 9 at 7:00 PM" - extract as "November 9, 7:00 PM"
5. If the page shows "This Saturday 7:00 PM" and you can see context that it's Nov 9 - extract as "November 9, 7:00 PM"
6. Look for date indicators in headings, sections, calendars, or near the event to find the actual date
7. If you can only find the time (like "7:30 PM") but the date is in a section heading above it, combine them!
8. It's better to skip an event than to use a day-of-week name without the actual date
9. SKIP events that are "ongoing", "permanent", or have no specific date - we only want events with concrete dates

OTHER REQUIREMENTS:
1. Extract EVERY SINGLE event on the page - DO NOT stop after a few events
2. If there are 50 events on the page, extract all 50
3. If there are 100 events on the page, extract all 100
4. For the category field, analyze the event content and assign the most appropriate category

Return ONLY a valid JSON array of events, nothing else. NO explanatory text, NO comments.
Format:
[{"title":"...","date":"YYYY-MM-DD","description":"...","time":"...","location":"...","category":"...","link":"...","ticketLink":"..."}]

Content to parse:
${scrapedContent.substring(0, 200000)}`,
            },
          ],
          });
          console.log(`[API] Claude API call successful for ${url}`);
        } catch (claudeError) {
          const errorMsg = `Claude API failed for ${url.substring(0, 40)}: ${claudeError instanceof Error ? claudeError.message : String(claudeError)}`;
          console.error(`[API] ${errorMsg}`);
          console.error(`[API] Full error:`, claudeError);
          errors.push(errorMsg);
          continue;
        }

        let eventsText = '';
        for (const block of response.content) {
          if (block.type === 'text') {
            eventsText += block.text;
          }
        }

        console.log(`[API] Claude response length for ${url}: ${eventsText.length} characters`);

        // Parse the JSON response from Claude
        try {
          // Log first/last 200 chars to debug
          console.log(`[API] Response preview for ${url}:`);
          console.log(`[API] First 200 chars: ${eventsText.substring(0, 200)}`);
          console.log(`[API] Last 200 chars: ${eventsText.substring(Math.max(0, eventsText.length - 200))}`);

          // First try to extract JSON array
          let jsonMatch = eventsText.match(/\[[\s\S]*\]/);

          // If no array found, try to extract JSON object (might be {"events": [...]})
          if (!jsonMatch) {
            console.log(`[API] No array found for ${url}, trying object match...`);
            const objectMatch = eventsText.match(/\{[\s\S]*\}/);
            if (objectMatch) {
              console.log(`[API] Object match found for ${url}, length: ${objectMatch[0].length}`);
              try {
                const parsed = JSON.parse(objectMatch[0]);
                console.log(`[API] Parsed object keys for ${url}: ${Object.keys(parsed).join(', ')}`);
                // Look for events array in common property names
                if (parsed.events && Array.isArray(parsed.events)) {
                  jsonMatch = [JSON.stringify(parsed.events)];
                  console.log(`[API] Found nested events array for ${url} with ${parsed.events.length} events`);
                }
              } catch (parseError) {
                console.log(`[API] Failed to parse object for ${url}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
              }
            } else {
              console.log(`[API] No object match found for ${url}`);
            }
          }

          if (!jsonMatch) {
            console.error(`[API] No JSON array found in response for ${url}`);
            continue;
          }

          let events;
          try {
            events = JSON.parse(jsonMatch[0]);
          } catch (jsonParseError) {
            console.error(`[API] Failed to parse JSON for ${url}:`, jsonParseError);
            continue;
          }

          if (!Array.isArray(events) || events.length === 0) {
            console.log(`[API] No events found in ${url}`);
            continue;
          }

          // Parse location to add borough, neighborhood, and coordinates
          // Enable geocoding for new events (with built-in rate limiting and error handling)
          console.log(`[API] Processing locations for ${events.length} events from ${url}...`);
          const eventsWithLocation = await Promise.all(
            events.map(async (event: Event) => {
              const { borough, neighborhood, lat, lng } = await parseLocation(event.location || '', true);
              // Infer actual dates from day-of-week references
              const inferredTime = inferDateFromDayOfWeek(event.time || '');
              // Infer/validate the structured date field
              const date = inferDateField({ ...event, time: inferredTime });
              return {
                ...event,
                time: inferredTime,
                date,
                borough,
                neighborhood,
                lat,
                lng,
              };
            })
          );

          console.log(`[API] Extracted ${eventsWithLocation.length} events from ${url}`);
          totalNewEvents += eventsWithLocation.length;

          // Update status with new events count
          try {
            const redis = getRedis();
            await redis.set(STATUS_KEY, {
              isRunning: true,
              currentSource: url,
              sourcesCompleted: i + 1, // This source is now complete
              totalSources: EVENT_URLS.length,
              eventsScraped: totalNewEvents,
              lastUpdate: new Date().toISOString(),
            });
          } catch (statusError) {
            console.error('[API] Error updating status after extraction:', statusError);
          }

          // INCREMENTAL SAVE: Merge with existing and save to cache immediately
          existingEvents = mergeEvents(existingEvents, eventsWithLocation);

          // Filter out past events before saving (keeps today and future events)
          const activeEvents = existingEvents.filter(event => !isEventPast(event));

          const responseData = {
            success: true,
            count: activeEvents.length,
            events: activeEvents,
            lastFetched: new Date().toISOString(),
          };

          try {
            const redis = getRedis();
            await redis.set(CACHE_KEY, responseData);
            console.log(`[API] Incremental save: ${activeEvents.length} total events cached (${eventsWithLocation.length} new from ${url})`);
          } catch (redisError) {
            console.error('[API] Error saving to Redis:', redisError);
          }

        } catch (parseError) {
          console.error('Failed to parse events JSON:', parseError);
        }
      } catch (urlError) {
        console.error(`[API] Error processing ${url}:`, urlError);
        // Continue to next URL even if one fails
      }
    }

    console.log(`[API] Total new events extracted: ${totalNewEvents}`);

    // Get final merged events (already saved incrementally)
    const mergedEvents = existingEvents;

    // BATCHED GEOCODING: Process events without coordinates
    const eventsNeedingGeocode = mergedEvents.filter(event => !event.lat || !event.lng);
    console.log(`[API] ${eventsNeedingGeocode.length} events need geocoding`);

    if (eventsNeedingGeocode.length > 0) {
      const BATCH_SIZE = 20; // Process 20 events at a time
      let geocodedCount = 0;

      for (let i = 0; i < eventsNeedingGeocode.length; i += BATCH_SIZE) {
        const batch = eventsNeedingGeocode.slice(i, i + BATCH_SIZE);
        console.log(`[API] Geocoding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eventsNeedingGeocode.length / BATCH_SIZE)} (${batch.length} events)`);

        // Geocode each event in the batch (rate limiting handled by parseLocation)
        const geocodedBatch = await Promise.all(
          batch.map(async (event) => {
            const { borough, neighborhood, lat, lng } = await parseLocation(event.location || '', true);
            if (lat && lng) {
              geocodedCount++;
            }
            return {
              ...event,
              borough: borough || event.borough,
              neighborhood: neighborhood || event.neighborhood,
              lat: lat || event.lat,
              lng: lng || event.lng,
            };
          })
        );

        // Update the events in mergedEvents array
        geocodedBatch.forEach((geocodedEvent) => {
          const index = mergedEvents.findIndex(e =>
            e.title.toLowerCase() === geocodedEvent.title.toLowerCase() &&
            (e.link === geocodedEvent.link || e.location === geocodedEvent.location)
          );
          if (index !== -1) {
            mergedEvents[index] = geocodedEvent;
          }
        });

        // Save incrementally after each batch (filter out past events)
        const activeEvents = mergedEvents.filter(event => !isEventPast(event));
        const responseData = {
          success: true,
          count: activeEvents.length,
          events: activeEvents,
          lastFetched: new Date().toISOString(),
        };

        try {
          const redis = getRedis();
          await redis.set(CACHE_KEY, responseData);
          console.log(`[API] Geocoding batch ${Math.floor(i / BATCH_SIZE) + 1} complete: ${geocodedCount} events geocoded so far`);
        } catch (redisError) {
          console.error('[API] Error saving geocoded batch to Redis:', redisError);
        }
      }

      console.log(`[API] Geocoding complete: ${geocodedCount}/${eventsNeedingGeocode.length} events successfully geocoded`);
    }

    // Filter out past events (already done in incremental saves, but do final check)
    const activeEvents = mergedEvents.filter(event => !isEventPast(event));
    const removedCount = mergedEvents.length - activeEvents.length;
    if (removedCount > 0) {
      console.log(`[API] Removed ${removedCount} past events in final pass`);
    }

    const responseData = {
      success: true,
      count: activeEvents.length,
      events: activeEvents,
      lastFetched: new Date().toISOString(),
    };

    // Final save to Redis (data already saved incrementally)
    try {
      const redis = getRedis();
      await redis.set(CACHE_KEY, responseData);
      console.log(`[API] Final save complete: ${activeEvents.length} total active events cached`);
    } catch (redisError) {
      console.error('[API] Error caching to Redis:', redisError);
      // Continue even if caching fails
    }

    return responseData;

  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

// POST handler - Run scraping directly (synchronous)
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Starting scraping directly');

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    const scrapflyApiKey = process.env.SCRAPFLY_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!firecrawlApiKey || !anthropicApiKey || !scrapflyApiKey) {
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    const redis = getRedis();

    // Check if a scrape is already running
    try {
      const currentStatus = await redis.get(STATUS_KEY);
      if (currentStatus && typeof currentStatus === 'object' && 'isRunning' in currentStatus) {
        const status = currentStatus as { isRunning: boolean; lastUpdate: string };
        if (status.isRunning) {
          // Check if the job is stale (older than 10 minutes)
          const lastUpdate = new Date(status.lastUpdate);
          const now = new Date();
          const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000 / 60;

          if (minutesSinceUpdate < 10) {
            console.log('[API] Scraping already in progress, rejecting new request');
            return NextResponse.json(
              {
                error: 'Scraping already in progress',
                message: 'A scraping job is currently running. Please wait for it to complete.',
              },
              { status: 409 } // 409 Conflict
            );
          } else {
            console.log(`[API] Found stale scraping job (${minutesSinceUpdate.toFixed(1)} minutes old), resetting and starting new one`);
          }
        }
      }
    } catch (statusCheckError) {
      console.error('[API] Error checking scraping status:', statusCheckError);
      // Continue anyway if we can't check status
    }

    // Set initial status
    await redis.set(STATUS_KEY, {
      isRunning: true,
      currentSource: '',
      sourcesCompleted: 0,
      totalSources: EVENT_URLS.length,
      eventsScraped: 0,
      lastUpdate: new Date().toISOString(),
    });
    console.log('[API] Set initial scraping status');

    // Get existing events from Redis at the start
    let existingEvents: Event[] = [];
    try {
      const cachedData = await redis.get<EventsResponse>(CACHE_KEY);
      if (cachedData) {
        existingEvents = cachedData.events || [];
        console.log(`[API] Found ${existingEvents.length} existing events in cache`);
      }
    } catch (redisError) {
      console.error('[API] Error reading from Redis:', redisError);
    }

    // Helper function to merge and deduplicate events
    const mergeEvents = (existing: Event[], newEvents: Event[]): Event[] => {
      const eventMap = new Map<string, Event>();

      // Add existing events first
      existing.forEach(event => {
        const key = `${event.title.toLowerCase()}|${event.link || event.location}`;
        eventMap.set(key, event);
      });

      // Add new events (will overwrite if duplicate, keeping fresher data)
      newEvents.forEach(event => {
        const key = `${event.title.toLowerCase()}|${event.link || event.location}`;
        eventMap.set(key, event);
      });

      return Array.from(eventMap.values());
    };

    let totalNewEvents = 0;
    const errors: string[] = [];

    // Scrape each URL and save incrementally
    for (let i = 0; i < EVENT_URLS.length; i++) {
      const url = EVENT_URLS[i];
      console.log(`[API] Scraping ${url}`);

      // Update status for current source
      try {
        await redis.set(STATUS_KEY, {
          isRunning: true,
          currentSource: url,
          sourcesCompleted: i,
          totalSources: EVENT_URLS.length,
          eventsScraped: totalNewEvents,
          lastUpdate: new Date().toISOString(),
          errors: errors.slice(-5), // Keep last 5 errors
        });
      } catch (statusError) {
        console.error('[API] Error updating status:', statusError);
      }

      // Special handling for eventlume.com to perform a deep scrape
      if (url.includes('eventlume.com')) {
        console.log(`[API] Performing deep scrape for ${url}`);
        let eventDetailUrls: string[] = [];

        // 1. Scrape the main page to get all event links
        try {
          const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${firecrawlApiKey}`,
            },
            body: JSON.stringify({ url: url, pageOptions: { onlyMainContent: true } }),
          });

          if (firecrawlResponse.ok) {
            const firecrawlData = await firecrawlResponse.json();
            const links: string[] = firecrawlData.data?.metadata?.links || [];
            eventDetailUrls = links
              .filter(link => link.startsWith('https://eventlume.com/events/new-york/'))
              .filter((link, index, self) => self.indexOf(link) === index); // Deduplicate
            console.log(`[API] Found ${eventDetailUrls.length} unique event detail links on ${url}`);
          } else {
            const errorMsg = `Failed to get links from ${url}, status: ${firecrawlResponse.status}`;
            console.error(`[API] ${errorMsg}`);
            errors.push(errorMsg);
            continue; // Skip to the next source in EVENT_URLS
          }
        } catch (linkError) {
          const errorMsg = `Error scraping links from ${url}: ${linkError instanceof Error ? linkError.message : String(linkError)}`;
          console.error(`[API] ${errorMsg}`);
          errors.push(errorMsg);
          continue; // Skip to the next source
        }

        // 2. Scrape each event detail page
        for (const detailUrl of eventDetailUrls) {
          try {
            console.log(`[API] Deep scraping event detail page: ${detailUrl}`);
            const detailResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${firecrawlApiKey}`,
              },
              body: JSON.stringify({
                url: detailUrl,
                formats: ['markdown'],
                waitFor: 3000,
                timeout: 30000,
              }),
            });

            if (!detailResponse.ok) {
              console.log(`[API] Firecrawl failed for detail page ${detailUrl}, status: ${detailResponse.status}`);
              continue; // Skip to next detail URL
            }

            const detailData = await detailResponse.json();
            const scrapedContent = detailData.data?.markdown;

            if (!scrapedContent) {
              console.log(`[API] No content found for detail page ${detailUrl}`);
              continue;
            }

            // The rest of the process (AI extraction, location parsing) is the same
            // Use Claude to extract structured event data
            const anthropic = new Anthropic({ apiKey: anthropicApiKey });
            const claudeResponse = await anthropic.messages.create({
              model: 'claude-haiku-4-5',
              max_tokens: 4096, // Can be smaller for single event pages
              messages: [
                {
                  role: 'user',
                  content: `You are an event extraction system. Extract the event from this page.

For the event, provide:
- title: The event name
- description: Brief description (2-3 sentences max)
- date: The event date in YYYY-MM-DD format (e.g. "2026-02-15"). For multi-day events, use the START date.
- time: FULL date and time (MUST include MONTH and DAY NUMBER like "November 9", plus time like "7:00 PM". NEVER use day-of-week names like "Saturday" alone!)
- location: Where it takes place (be specific, include venue name)
- category: Choose ONE category that best fits the event from these options: "Cultural & Arts", "Fitness & Wellness", "Sports & Recreation", "Markets & Shopping", "Community & Volunteering", "Food & Dining", "Holiday & Seasonal", "Professional & Networking", "Educational & Literary"
- link: Use this exact URL: ${detailUrl}
- ticketLink: URL to buy tickets (if available)

CRITICAL REQUIREMENTS:
1. Extract MONTH + DAY format: "November 9", "December 15"
2. NEVER use relative dates like "Today", "Tomorrow"
3. Combine date and time info if they are separate on the page.
4. SKIP events that are "ongoing", "permanent", or have no specific date - we only want events with concrete dates

Return ONLY a valid JSON object for this single event, nothing else. NO explanatory text, NO comments.
Format:
{"title":"...","date":"YYYY-MM-DD","description":"...","time":"...","location":"...","category":"...","link":"...","ticketLink":"..."}

Content to parse:
${scrapedContent.substring(0, 100000)}`,
                },
              ],
            });

            let eventText = '';
            for (const block of claudeResponse.content) {
              if (block.type === 'text') {
                eventText += block.text;
              }
            }
            
            const jsonMatch = eventText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              console.error(`[API] No JSON object found in response for ${detailUrl}`);
              continue;
            }

            let event: Event;
            try {
              event = JSON.parse(jsonMatch[0]);
            } catch (jsonParseError) {
              console.error(`[API] Failed to parse JSON for ${detailUrl}:`, jsonParseError);
              continue;
            }
            
            // This will return an object for a single event, wrap it in an array
            const eventsWithLocation = await Promise.all(
              [event].map(async (e: Event) => {
                const { borough, neighborhood, lat, lng } = await parseLocation(e.location || '', false);
                const inferredTime = inferDateFromDayOfWeek(e.time || '');
                const date = inferDateField({ ...e, time: inferredTime });
                return { ...e, time: inferredTime, date, borough, neighborhood, lat, lng };
              })
            );

            totalNewEvents += eventsWithLocation.length;

            // INCREMENTAL SAVE
            existingEvents = mergeEvents(existingEvents, eventsWithLocation);
            const activeEvents = existingEvents.filter(ev => !isEventPast(ev));
            await redis.set(CACHE_KEY, {
              success: true,
              count: activeEvents.length,
              events: activeEvents,
              lastFetched: new Date().toISOString(),
            });
            console.log(`[API] Incremental save: ${activeEvents.length} total events cached (${eventsWithLocation.length} new from ${detailUrl})`);
          
          } catch (detailError) {
             console.error(`[API] Error processing detail URL ${detailUrl}:`, detailError);
          }
        }
      } else {
        // This is the original logic for all other non-eventlume URLs
        try {
          let scrapedContent = '';
          let scraper = '';

          // Try Firecrawl first
          try {
            const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${firecrawlApiKey}`,
              },
              body: JSON.stringify({
                url: url,
                formats: ['markdown', 'html'],
                waitFor: 3000,
                timeout: 30000,
              }),
            });

            if (firecrawlResponse.ok) {
              const firecrawlData = await firecrawlResponse.json();
              scrapedContent = firecrawlData.data?.markdown || firecrawlData.data?.html || '';
              if (scrapedContent) {
                scraper = 'Firecrawl';
                console.log(`[API] Firecrawl success for ${url}`);
              }
            } else {
              console.log(`[API] Firecrawl failed for ${url}, status: ${firecrawlResponse.status}`);
            }
          } catch (firecrawlError) {
            console.log(`[API] Firecrawl error for ${url}:`, firecrawlError);
          }

          // If Firecrawl failed or returned no content, try Scrapfly
          if (!scrapedContent) {
            console.log(`[API] Trying Scrapfly for ${url}`);
            try {
              const scrapflyUrl = new URL('https://api.scrapfly.io/scrape');
              scrapflyUrl.searchParams.append('key', scrapflyApiKey);
              scrapflyUrl.searchParams.append('url', url);
              scrapflyUrl.searchParams.append('render_js', 'true');
              scrapflyUrl.searchParams.append('format', 'markdown');
              scrapflyUrl.searchParams.append('asp', 'true');

              const scrapflyResponse = await fetch(scrapflyUrl.toString());

              if (scrapflyResponse.ok) {
                const scrapflyData = await scrapflyResponse.json();
                scrapedContent = scrapflyData.result?.content || '';
                if (scrapedContent) {
                  scraper = 'Scrapfly';
                  console.log(`[API] Scrapfly success for ${url}`);
                }
              } else {
                console.log(`[API] Scrapfly failed for ${url}, status: ${scrapflyResponse.status}`);
              }
            } catch (scrapflyError) {
              console.log(`[API] Scrapfly error for ${url}:`, scrapflyError);
            }
          }

          // If both scrapers failed, skip this URL
          if (!scrapedContent) {
            const errorMsg = `Scrapers failed for ${url.substring(0, 50)}...`;
            console.error(`[API] ${errorMsg}`);
            errors.push(errorMsg);
            continue;
          }

          console.log(`[API] Content length from ${url} (via ${scraper}): ${scrapedContent.length} characters`);

          // Use Claude to extract structured event data
          const anthropic = new Anthropic({
            apiKey: anthropicApiKey,
          });

          let response;
          try {
            console.log(`[API] Calling Claude API for ${url}...`);
            response = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 8192,
            messages: [
              {
                role: 'user',
                content: `You are an event extraction system. Extract EVERY SINGLE event from this NYC events page.

For each event, provide:
- title: The event name
- description: Brief description (2-3 sentences max)
- date: The event date in YYYY-MM-DD format (e.g. "2026-02-15"). For multi-day events, use the START date.
- time: FULL date and time (MUST include the MONTH and DAY NUMBER like "November 9" or "Dec 15", plus the time like "7:00 PM". NEVER use day-of-week names like "Saturday" or "Thursday" alone!)
- location: Where it takes place (be specific, include neighborhood or venue name)
- category: Choose ONE category that best fits the event from these options: "Cultural & Arts", "Fitness & Wellness", "Sports & Recreation", "Markets & Shopping", "Community & Volunteering", "Food & Dining", "Holiday & Seasonal", "Professional & Networking", "Educational & Literary"
- link: URL to event page (if available)
- ticketLink: URL to buy tickets (if available)

CRITICAL REQUIREMENTS FOR DATES:
1. ALWAYS use MONTH + DAY format: "November 9", "December 15", "Jan 20"
2. NEVER use ONLY day-of-week names like "Saturday", "Thursday", "Monday"
3. NEVER use relative dates like "Today", "Tomorrow", "This Weekend"
4. If the page shows "Saturday, November 9 at 7:00 PM" - extract as "November 9, 7:00 PM"
5. If the page shows "This Saturday 7:00 PM" and you can see context that it's Nov 9 - extract as "November 9, 7:00 PM"
6. Look for date indicators in headings, sections, calendars, or near the event to find the actual date
7. If you can only find the time (like "7:30 PM") but the date is in a section heading above it, combine them!
8. It's better to skip an event than to use a day-of-week name without the actual date
9. SKIP events that are "ongoing", "permanent", or have no specific date - we only want events with concrete dates

OTHER REQUIREMENTS:
1. Extract EVERY SINGLE event on the page - DO NOT stop after a few events
2. If there are 50 events on the page, extract all 50
3. If there are 100 events on the page, extract all 100
4. For the category field, analyze the event content and assign the most appropriate category

Return ONLY a valid JSON array of events, nothing else. NO explanatory text, NO comments.
Format:
[{"title":"...","date":"YYYY-MM-DD","description":"...","time":"...","location":"...","category":"...","link":"...","ticketLink":"..."}]

Content to parse:
${scrapedContent.substring(0, 200000)}`,
              },
            ],
            });
            console.log(`[API] Claude API call successful for ${url}`);
          } catch (claudeError) {
            const errorMsg = `Claude API failed for ${url.substring(0, 40)}: ${claudeError instanceof Error ? claudeError.message : String(claudeError)}`;
            console.error(`[API] ${errorMsg}`);
            console.error(`[API] Full error:`, claudeError);
            errors.push(errorMsg);
            continue;
          }

          let eventsText = '';
          for (const block of response.content) {
            if (block.type === 'text') {
              eventsText += block.text;
            }
          }

          console.log(`[API] Claude response length for ${url}: ${eventsText.length} characters`);

          // Parse the JSON response from Claude
          try {
            // Log first/last 200 chars to debug
            console.log(`[API] Response preview for ${url}:`);
            console.log(`[API] First 200 chars: ${eventsText.substring(0, 200)}`);
            console.log(`[API] Last 200 chars: ${eventsText.substring(Math.max(0, eventsText.length - 200))}`);

            // First try to extract JSON array
            let jsonMatch = eventsText.match(/\[[\s\S]*\]/);

            // If no array found, try to extract JSON object (might be {"events": [...]})
            if (!jsonMatch) {
              console.log(`[API] No array found for ${url}, trying object match...`);
              const objectMatch = eventsText.match(/\{[\s\S]*\}/);
              if (objectMatch) {
                console.log(`[API] Object match found for ${url}, length: ${objectMatch[0].length}`);
                try {
                  const parsed = JSON.parse(objectMatch[0]);
                  console.log(`[API] Parsed object keys for ${url}: ${Object.keys(parsed).join(', ')}`);
                  // Look for events array in common property names
                  if (parsed.events && Array.isArray(parsed.events)) {
                    jsonMatch = [JSON.stringify(parsed.events)];
                    console.log(`[API] Found nested events array for ${url} with ${parsed.events.length} events`);
                  }
                } catch (parseError) {
                  console.log(`[API] Failed to parse object for ${url}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
                }
              } else {
                console.log(`[API] No object match found for ${url}`);
              }
            }

            if (!jsonMatch) {
              console.error(`[API] No JSON array found in response for ${url}`);
              continue;
            }

            let events;
            try {
              events = JSON.parse(jsonMatch[0]);
            } catch (jsonParseError) {
              console.error(`[API] Failed to parse JSON for ${url}:`, jsonParseError);
              continue;
            }

            if (!Array.isArray(events) || events.length === 0) {
              console.log(`[API] No events found in ${url}`);
              continue;
            }

            // Parse location to add borough, neighborhood, and coordinates
            console.log(`[API] Processing locations for ${events.length} events from ${url}...`);
            const eventsWithLocation = await Promise.all(
              events.map(async (event: Event) => {
                const { borough, neighborhood, lat, lng } = await parseLocation(event.location || '', false);
                // Infer actual dates from day-of-week references
                const inferredTime = inferDateFromDayOfWeek(event.time || '');
                // Infer/validate the structured date field
                const date = inferDateField({ ...event, time: inferredTime });
                return {
                  ...event,
                  time: inferredTime,
                  date,
                  borough,
                  neighborhood,
                  lat,
                  lng,
                };
              })
            );

            console.log(`[API] Extracted ${eventsWithLocation.length} events from ${url}`);
            totalNewEvents += eventsWithLocation.length;

            // Update status with new events count
            try {
              await redis.set(STATUS_KEY, {
                isRunning: true,
                currentSource: url,
                sourcesCompleted: i + 1,
                totalSources: EVENT_URLS.length,
                eventsScraped: totalNewEvents,
                lastUpdate: new Date().toISOString(),
              });
            } catch (statusError) {
              console.error('[API] Error updating status after extraction:', statusError);
            }

            // INCREMENTAL SAVE: Merge with existing and save to cache immediately
            existingEvents = mergeEvents(existingEvents, eventsWithLocation);

            // Filter out past events before saving (keeps today and future events)
            const activeEvents = existingEvents.filter(event => !isEventPast(event));

            const responseData = {
              success: true,
              count: activeEvents.length,
              events: activeEvents,
              lastFetched: new Date().toISOString(),
          };

          try {
            await redis.set(CACHE_KEY, responseData);
            console.log(`[API] Incremental save: ${activeEvents.length} total events cached (${eventsWithLocation.length} new from ${url})`);
          } catch (redisError) {
            console.error('[API] Error saving to Redis:', redisError);
          }

        } catch (parseError) {
          console.error('[API] Failed to parse events JSON:', parseError);
        }
      } catch (urlError) {
        console.error(`[API] Error processing ${url}:`, urlError);
      }
      } // close else block (non-eventlume)
    }

    console.log(`[API] Total new events extracted: ${totalNewEvents}`);

    // Mark as complete
    await redis.set(STATUS_KEY, {
      isRunning: false,
      currentSource: '',
      sourcesCompleted: EVENT_URLS.length,
      totalSources: EVENT_URLS.length,
      eventsScraped: totalNewEvents,
      lastUpdate: new Date().toISOString(),
    });
    console.log('[API] Scraping complete');

    // Save completion timestamp for scheduled scraping
    await redis.set('scraping:lastCompleted', Date.now().toString());

    // Trigger automatic geocoding in background (don't wait for it)
    console.log('[API] Triggering automatic geocoding...');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://ephemera-nyc-0c9477e4fde1.herokuapp.com'}/api/events/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(err => {
      console.error('[API] Failed to trigger geocoding:', err);
    });

    // Trigger automatic enrichment in background (don't wait for it)
    console.log('[API] Triggering automatic enrichment...');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://ephemera-nyc-0c9477e4fde1.herokuapp.com'}/api/events/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(err => {
      console.error('[API] Failed to trigger enrichment:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Scraping completed successfully',
      eventsScraped: totalNewEvents,
      totalEvents: existingEvents.length,
      count: existingEvents.length,
      lastFetched: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API] Handler error:', error);

    // Mark as failed
    try {
      const redis = getRedis();
      await redis.set(STATUS_KEY, {
        isRunning: false,
        currentSource: '',
        sourcesCompleted: 0,
        totalSources: EVENT_URLS.length,
        eventsScraped: 0,
        lastUpdate: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (redisError) {
      console.error('[API] Error setting failed status:', redisError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start scraping',
      },
      { status: 500 }
    );
  }
}

// GET handler for Vercel cron job
export async function GET(request: NextRequest) {
  try {
    // Verify QStash signature (allows cron and development mode)
    const isValid = await verifyQStashSignature(request);
    if (!isValid) {
      console.error('[API] Unauthorized request - invalid signature');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await fetchEventsLogic();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      },
      { status: 500 }
    );
  }
}
