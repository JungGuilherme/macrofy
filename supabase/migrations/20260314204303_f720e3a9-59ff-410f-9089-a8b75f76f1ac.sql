
-- Fix Selic: series 11 is daily overnight rate (0.05%), change to 432 = Meta Selic (13.25% a.a.)
UPDATE macro_series_metadata 
SET series_code = '432', 
    indicator = 'Selic Meta',
    frequency = 'monthly',
    notes = 'Meta para a Taxa Selic definida pelo Copom (% a.a.)'
WHERE series_code = '11' AND country = 'BR';

-- Delete old incorrect data for series 11
DELETE FROM macro_heatmap_data WHERE series_code = '11' AND country = 'BR';
