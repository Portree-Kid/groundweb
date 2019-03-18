# groundweb
REST API for the submission of flightgear airport data (groundnets ...)

##Thresholds

## Submission of groundnets

Groundnets can be submitted via HTTP POST to the URL [http://localhost:3000/groundnets/upload]. The file has to be added as parameter ``groundnet```. 
 The file is checked against a series of checks. 
1. Parsable XML
2. [XSD](https://raw.githubusercontent.com/Portree-Kid/groundweb/master/schema/groundnet.xsd) check 
3. Check if airport exists in scenery (DB apt_airfield)
4. [TODO] Existence of runways
5. [TODO] Uniqueness of parking spots
4. Save File
5. SHA1 file
 
