'use client';

// Venue data organized by category
const VENUES = {
  'General NYC Sources': [
    { name: 'NYC.gov Events', url: 'https://www.nyc.gov/main/events/' },
    { name: 'Lu.ma NYC', url: 'https://lu.ma/nyc' },
    { name: 'Eventlume', url: 'https://eventlume.com/things-to-do/new-york' },
    { name: 'Secret NYC', url: 'https://secretnyc.co/what-to-do-this-weekend-nyc/' },
    { name: 'NYC Parks Events', url: 'https://www.nycgovparks.org/events/' },
    { name: 'NYC For Free', url: 'https://www.nycforfree.co/events' },
    { name: 'NY Event Radar', url: 'https://ny-event-radar.com' },
  ],
  'Major Venues': [
    { name: 'Beacon Theatre', url: 'https://www.msg.com/beacon-theatre/calendar?venue=beacon-theatre&venues=KovZpZAEAd6A' },
    { name: 'The Bell House', url: 'https://www.thebellhouseny.com/shows' },
    { name: 'Music Hall of Williamsburg', url: 'https://www.musichallofwilliamsburg.com/events' },
    { name: 'Elsewhere', url: 'https://www.elsewherebrooklyn.com/events' },
    { name: "Baby's All Right", url: 'https://wl.eventim.us/BabysAllRightBrooklyn' },
    { name: 'Saint Vitus', url: 'https://www.saintvitusbar.com/events' },
    { name: 'National Sawdust', url: 'https://nationalsawdust.org/events/' },
    { name: 'Knitting Factory', url: 'https://bk.knittingfactory.com/calendar/' },
    { name: 'Market Hotel', url: 'https://www.markethotel.org/calendar#/events' },
    { name: 'Terminal 5', url: 'https://www.terminal5nyc.com/events' },
    { name: 'Bowery Ballroom', url: 'https://www.boweryballroom.com/events' },
    { name: 'Brooklyn Steel', url: 'https://www.bowerypresents.com/venues/brooklyn-steel' },
    { name: 'Rough Trade NYC', url: 'https://www.roughtradenyc.com/calendar/' },
    { name: 'Webster Hall', url: 'https://www.bowerypresents.com/shows/webster-hall' },
    { name: 'Brooklyn Bowl', url: 'https://www.brooklynbowl.com/brooklyn/shows/all' },
    { name: 'Irving Plaza', url: 'https://www.irvingplaza.com/shows' },
    { name: "SOB's", url: 'https://sobs.com/events' },
    { name: 'Warsaw', url: 'https://mercuryeastpresents.com/war-saw/' },
    { name: 'Gramercy Theatre', url: 'https://www.thegramercytheatre.com/' },
    { name: 'Barclays Center', url: 'https://www.barclayscenter.com/events' },
    { name: 'Kings Theatre', url: 'https://www.kingstheatre.com/events/' },
    { name: 'MSG', url: 'https://www.msg.com/calendar' },
    { name: 'Radio City Music Hall', url: 'https://www.radiocity.com/events' },
    { name: 'Forest Hills Stadium', url: 'https://www.foresthillsstadium.com' },
    { name: 'Sony Hall', url: 'https://www.sonyhall.com/events' },
    { name: 'Brooklyn Paramount', url: 'https://www.brooklynparamount.com' },
  ],
  'Manhattan Music Venues': [
    { name: 'City Winery', url: 'https://citywinery.com/new-york-city/events' },
    { name: "Joe's Pub", url: 'https://publictheater.org/joes-pub/' },
    { name: 'Le Poisson Rouge', url: 'https://lpr.com' },
    { name: 'The Cutting Room', url: 'https://thecuttingroomnyc.com/calendar/' },
    { name: 'The Stone', url: 'http://thestonenyc.com/calendar.php' },
    { name: 'Mercury Lounge', url: 'https://mercuryeastpresents.com/mercurylounge/' },
    { name: 'The Delancey', url: 'https://www.thedelancey.com/events' },
    { name: 'Berlin', url: 'https://berlin.nyc' },
    { name: "Arlene's Grocery", url: 'https://www.arlenesgrocerynyc.com/upcoming-events' },
    { name: "Otto's Shrunken Head", url: 'https://www.ottosshrunkenhead.com/pages/events.php' },
    { name: 'DROM', url: 'https://dromnyc.com/events/' },
    { name: 'Cafe Wha?', url: 'https://www.cafewha.com/calendar' },
    { name: 'Bathtub Gin', url: 'https://www.bathtubginnyc.com/entertainment-nyc/' },
    { name: 'Rockwood Music Hall', url: 'https://www.rockwoodmusichall.com' },
    { name: 'The Bowery Electric', url: 'https://www.theboweryelectric.com/calendar/' },
    { name: 'Pianos', url: 'https://pianosnyc.com/SHOWS' },
    { name: 'Nublu', url: 'https://nublu.net/program' },
    { name: 'Chelsea Music Hall', url: 'https://www.chelseamusichall.com/' },
    { name: 'The Bitter End', url: 'https://bitterend.com/' },
  ],
  'Brooklyn Small Venues': [
    { name: "Pete's Candy Store", url: 'https://www.petescandystore.com/calendar/' },
    { name: 'TV Eye', url: 'https://tveyenyc.com/calendar/' },
    { name: 'The Tiny Cupboard', url: 'https://www.thetinycupboard.com/calendar' },
    { name: 'House of Yes', url: 'https://www.houseofyes.org/calendar' },
    { name: 'Littlefield', url: 'https://littlefieldnyc.com/all-shows/' },
    { name: 'Union Hall', url: 'https://www.unionhallny.com/calendar' },
    { name: 'Public Records', url: 'https://publicrecords.nyc' },
    { name: 'The Sultan Room', url: 'https://www.thesultanroom.com/calendar' },
    { name: 'Gold Sounds', url: 'https://www.goldsoundsbar.com' },
    { name: 'Alphaville', url: 'https://www.alphavillebar.com' },
    { name: 'Brooklyn Made', url: 'https://www.brooklynmade.com/calendar' },
    { name: 'Good Room', url: 'https://www.goodroombk.com' },
    { name: 'Silo Brooklyn', url: 'https://www.silobrooklyn.com' },
    { name: 'The Gutter', url: 'https://www.gutterbarbowl.com/williamsburg' },
    { name: 'Skinny Dennis', url: 'https://skinnydennisbrooklyn.com' },
    { name: 'Friends & Lovers', url: 'https://www.fnlbk.com/upcoming' },
    { name: "Hank's Saloon", url: 'https://hankssaloon.com/calendar/' },
    { name: "C'mon Everybody", url: 'https://www.cmoneverybody.com/events' },
  ],
  'Performance Halls': [
    { name: 'Symphony Space', url: 'https://www.symphonyspace.org/events' },
    { name: 'BAM', url: 'https://www.bam.org' },
    { name: 'Lincoln Center', url: 'https://www.lincolncenter.org/lincoln-center-at-home/calendar' },
    { name: 'Carnegie Hall', url: 'https://www.carnegiehall.org/Events' },
    { name: 'Apollo Theater', url: 'https://www.apollotheater.org/ticket-and-events' },
    { name: 'The Town Hall', url: 'https://www.thetownhall.org/events' },
    { name: 'Bargemusic', url: 'https://www.bargemusic.org/concerts' },
  ],
  'Jazz Clubs': [
    { name: 'Village Vanguard', url: 'https://www.villagevanguard.com' },
    { name: 'Blue Note', url: 'https://www.bluenotejazz.com/nyc/shows/' },
    { name: "Smoke Jazz Club", url: 'https://smokejazz.com/' },
    { name: 'Jazz Music NYC', url: 'https://www.jazzmusicnyc.com' },
    { name: 'Jazz 966', url: 'https://www.jazz966.org' },
    { name: 'Birdland', url: 'https://www.birdlandjazz.com/calendar/' },
    { name: "Smalls", url: 'https://www.smallslive.com/' },
    { name: 'Mezzrow', url: 'https://www.smallslive.com/mezzrow/' },
    { name: 'The Django', url: 'https://www.thedjangonyc.com/events/' },
    { name: 'The Iridium', url: 'https://www.theiridium.com/events' },
    { name: 'Zinc Bar', url: 'https://www.zincbar.com/calendar/' },
    { name: 'Terra Blues', url: 'https://www.terrablues.com/calendar' },
    { name: 'Village Underground', url: 'https://thevillageunderground.com' },
    { name: "Dizzy's Club", url: 'https://jazz.org/dizzys/' },
  ],
  'Comedy Clubs': [
    { name: 'Eastville Comedy', url: 'https://www.eastvillecomedy.com/calendar' },
    { name: 'Brooklyn Comedy Collective', url: 'https://www.brooklyncc.com/whats-playing-shows' },
    { name: 'New York Comedy Club', url: 'https://newyorkcomedyclub.com/calendar' },
    { name: 'Gotham Comedy Club', url: 'https://www.gothamcomedyclub.com/calendar' },
    { name: 'Westside Comedy Club', url: 'https://www.westsidecomedyclub.com/calendar' },
    { name: 'The Stand', url: 'https://www.thestandnyc.com/shows' },
    { name: 'Comic Strip Live', url: 'https://comicstriplive.com' },
    { name: 'Broadway Comedy Club', url: 'https://broadwaycomedyclub.com/shows' },
    { name: 'Magnet Theater', url: 'https://magnettheater.com/' },
    { name: 'UCB', url: 'https://ucbcomedy.com/' },
    { name: 'The PIT', url: 'https://thepit-nyc.com/calendar/' },
  ],
  'Art & Cultural Spaces': [
    { name: 'MoMA', url: 'https://www.moma.org/calendar' },
    { name: 'The Met', url: 'https://www.metmuseum.org/events' },
    { name: 'Brooklyn Museum', url: 'https://www.brooklynmuseum.org/calendar' },
    { name: 'Guggenheim', url: 'https://www.guggenheim.org/event' },
    { name: 'Whitney', url: 'https://whitney.org/events' },
    { name: 'Museum of the City of NY', url: 'https://www.mcny.org/events' },
    { name: 'The Frick', url: 'https://www.frick.org/events' },
    { name: 'The Morgan Library', url: 'https://www.themorgan.org/programs' },
    { name: 'New Museum', url: 'https://www.newmuseum.org/calendar' },
    { name: 'Studio Museum in Harlem', url: 'https://studiomuseum.org/calendar' },
    { name: 'AMNH', url: 'https://www.amnh.org/calendar' },
    { name: 'NY Historical Society', url: 'https://www.nyhistory.org/events' },
    { name: 'Pioneer Works', url: 'https://www.pioneerworks.org/events' },
    { name: "St. Ann's Warehouse", url: 'https://www.saintannswarehouse.org' },
    { name: 'Knockdown Center', url: 'https://www.knockdown.center' },
  ],
  'Queens Venues': [
    { name: 'Queens Theatre', url: 'https://www.queenstheatre.org/events' },
    { name: 'The Side Farm', url: 'https://www.thesidefarm.com/events' },
    { name: 'The Kitchen Queens', url: 'https://thekitchenqueens.com' },
    { name: 'UBS Arena', url: 'https://www.ubsarena.com/events' },
    { name: 'Flushing Town Hall', url: 'https://www.flushingtownhall.org/events' },
    { name: 'Socrates Sculpture Park', url: 'https://www.socratessculpturepark.org/event' },
    { name: 'Trans-Pecos', url: 'https://www.thetranspecos.com/' },
    { name: 'Footlight Underground', url: 'https://www.footlightunderground.com/' },
  ],
  'Nightclubs & Dance': [
    { name: 'Avant Gardner', url: 'https://www.avant-gardner.com/events' },
    { name: 'Elsewhere Club', url: 'https://www.elsewhere.club/events' },
    { name: 'Cielo', url: 'https://www.cielo-club.com' },
    { name: 'Marquee', url: 'https://taogroup.com/venues/marquee-new-york/events/' },
    { name: 'Nowadays', url: 'https://nowadays.nyc/' },
    { name: 'Le Bain', url: 'https://www.standardhotels.com/new-york/features/le-bain' },
    { name: 'Nebula', url: 'https://www.nebula.nyc/events' },
  ],
  'Cabaret & Supper Clubs': [
    { name: 'The Duplex', url: 'https://www.theduplex.com/upcoming' },
    { name: "Don't Tell Mama", url: 'https://shows.donttellmamanyc.com/' },
    { name: '54 Below', url: 'https://54below.org/calendar/' },
    { name: 'The Slipper Room', url: 'https://www.slipperroom.com/calendar' },
    { name: 'Sid Gold\'s Request Room', url: 'https://sidgolds.com/new-york/new-york-events/' },
  ],
  'Theater & Performance': [
    { name: 'Ars Nova', url: 'https://arsnovanyc.com/' },
    { name: 'Caveat', url: 'https://caveat.nyc/events' },
    { name: 'National Sawdust Performances', url: 'https://www.nationalsawdust.org/performances' },
  ],
  'Bars & Nightlife with Events': [
    { name: 'The Dead Rabbit', url: 'https://thedeadrabbit.com/event/' },
    { name: "Arthur's Tavern", url: 'https://arthurstavern.nyc/events/' },
    { name: "Paddy Reilly's", url: 'https://paddyreillysmusicbar.us/live-music-at-paddy-reillys-music-bar/' },
    { name: 'Parkside Lounge', url: 'https://www.parksidelounge.nyc/calendar' },
    { name: 'Club Cumming', url: 'https://clubcummingnyc.com' },
    { name: 'White Horse Tavern', url: 'https://www.whitehorsetavern1880.com/events' },
    { name: 'Shrine', url: 'https://shrinenyc.com/' },
    { name: 'Pangea', url: 'https://www.pangeanyc.com/' },
    { name: 'Fraunces Tavern Museum', url: 'https://www.frauncestavernmuseum.org/events-calendar' },
  ],
  'College & University Events': [
    { name: 'NYU Events', url: 'https://events.nyu.edu/' },
    { name: 'NYU Skirball', url: 'https://nyuskirball.org/events/' },
    { name: 'Columbia Events', url: 'https://events.columbia.edu/' },
    { name: 'CUNY Events', url: 'https://events.cuny.edu/' },
    { name: 'Cooper Union', url: 'https://cooper.edu/events-and-exhibitions/events' },
    { name: 'The New School', url: 'https://events.newschool.edu/' },
  ],
};

export default function VenuesPage() {
  const categories = Object.keys(VENUES);
  const totalVenues = Object.values(VENUES).reduce((acc, venues) => acc + venues.length, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDECE8]">
      {/* Subtle top gradient */}
      <div className="fixed top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#1a1210] to-transparent pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="container mx-auto px-8 pt-8 flex justify-between items-center max-w-6xl">
          <a href="/" className="text-sm text-[#5C5A54] hover:text-[#E8503A] transition-colors font-sans">
            &larr; Events
          </a>
          <div className="text-sm text-[#5C5A54] font-sans">{totalVenues} sources</div>
        </nav>

        <div className="container mx-auto px-8 pt-16 pb-24">
          <div className="max-w-6xl mx-auto">
            {/* Hero */}
            <header className="mb-16">
              <h1 className="text-[64px] md:text-[88px] leading-[0.9] font-display font-800 tracking-[-0.04em] mb-4">
                Venues
              </h1>
              <div className="w-16 h-1 bg-[#E8503A] rounded-full mb-6" />
              <p className="text-xl text-[#8C8A82] font-sans font-light max-w-lg">
                {totalVenues} venues and sources across New York City
              </p>
            </header>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2 mb-16">
              {categories.map((category) => (
                <a
                  key={category}
                  href={`#${category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-4 py-2 bg-[#1C1C1F] text-[#8C8A82] rounded-lg text-sm font-sans border border-[#252528] hover:border-[#3A3A3E] hover:text-[#EDECE8] transition-all"
                >
                  {category} <span className="text-[#5C5A54]">({VENUES[category as keyof typeof VENUES].length})</span>
                </a>
              ))}
            </div>

            {/* Venue listings */}
            <div className="space-y-16">
              {categories.map((category) => (
                <section key={category} id={category.toLowerCase().replace(/\s+/g, '-')}>
                  <h2 className="font-display font-700 text-2xl mb-6 text-[#EDECE8] pb-4 border-b border-[#252528]">
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {VENUES[category as keyof typeof VENUES].map((venue, index) => (
                      <a
                        key={index}
                        href={venue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card-glow bg-[#141416] rounded-xl border border-[#252528] p-5 group"
                      >
                        <h3 className="text-sm font-sans font-medium text-[#EDECE8] group-hover:text-[#E8503A] transition-colors">
                          {venue.name}
                        </h3>
                        <p className="text-xs text-[#5C5A54] font-sans mt-1.5 truncate">
                          {venue.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </p>
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-24 pt-8 border-t border-[#252528]">
              <p className="text-sm text-[#5C5A54] font-sans">
                Missing a venue?{' '}
                <a href="mailto:hello@eventsh.nyc" className="text-[#8C8A82] hover:text-[#E8503A] transition-colors">
                  Let us know
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
