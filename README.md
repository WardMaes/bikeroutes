# Bikeroutes

## Inspiration
As someone who loves going for a ride on his bike, I had difficulties finding decent roads to ride on. This webapp should solve that problem, by giving me an interface I'm familiar with (Google Maps) which contains all the relevant data about the roads in the neighborhood. 

## What it does
A crowdsourced data aggregation platform, which means anyone can upload data about roads. 
Adding data is done by drawing on the map, that's it! 
If there would be any conflicts about the condition of a road (e.g. a person said the road is in a bad condition, but someone else argues it's in a very good state. Which one is correct?), the vote functionality can bring clarity. People can vote for the best fitting information in the case of a conflict, keeping the data as reliable as possible by doing so. 

## How we built it
Using the power of serverless functions on the Vercel infrastructure, the data is sent to/retrieved from the cloud hosted Planetscale database. 
With React on the frontend and Tailwindcss as styling library, the user is presented a clean interface (yes, also on mobile devices) which allows for easy drawing on the map by using the Google Maps snap-to-road API. 
The customized Google Maps theme is the icing on the cake, to really deliver that Google-like product feel. 

## Challenges we ran into
Keeping the webapp smooth, while also processing a lot of data. This was mainly due to a poorly designed database structure at first, but this has been resolved later on. 

## Accomplishments that we're proud of
The time it took to set up a Google Maps project, customize the interface and add the drawing functionality was a big unknown variable at first but it turned out to be pretty trivial. Great way to start a project! 

## What's next for Bike routes
Create your own bike routes and share them with other bikers, deliver more statistics and data insights on routes (e.g. 30% offroad, 10% asphalt,...), search for routes, add custom info to routes,... 
