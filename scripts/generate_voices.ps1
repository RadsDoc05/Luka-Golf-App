# generate_voices.ps1
# Pre-renders the natural neural voice pack directly into assets/audio/voice/*.mp3

$outDir = Join-Path $PSScriptRoot "..\assets\audio\voice"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Remove temporary test artifacts if present
Remove-Item (Join-Path $outDir "test_gtts.mp3") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $outDir "test_tt.json") -ErrorAction SilentlyContinue

$clips = @{
    "welcome_luka"       = "Hi Luka! Welcome to your eighteen hole golf adventure! Let's hit a super drive!"
    "great_shot"         = "Great shot, Luka!"
    "dino_nest"          = "Plopped right into a sleeping pterodactyl nest! Look at that wobbly egg! Time for a rescue shot!"
    "lava_vent"          = "Splashed into a bubbling volcano lava vent with a silly sizzle! Time for a rescue shot!"
    "mishap_kiddie_pool" = "Bounced off a coconut tree right into the inflatable kiddie pool! Time for a rescue shot!"
    "mishap_hovercar"    = "Bounced right off a flying hovercar windshield! Beep beep! Time for a rescue shot!"
    "mishap_canyon"      = "Danced across the rickety rope bridge and splashed by the waterfall! Time for a rescue shot!"
    "cel_hole_in_one"    = "Hole in one! Unbelievable shot, Luka!"
    "cel_eagle"          = "Golden Eagle! Two under par! Watch the Golden Eagle soar!"
    "cel_birdie"         = "Sweet Birdie! One under par! A bluebird perched on the flag!"
    "cel_par"            = "Super Par! High five! Right on target, Luka!"
    "cel_bogey"          = "Great effort! Awesome persistence! Onto the next hole!"
    "num_1"              = "1"
    "num_2"              = "2"
    "num_3"              = "3"
    "num_4"              = "4"
    "num_5"              = "5"
    "num_6"              = "6"
    "num_7"              = "7"
    "num_8"              = "8"
    "num_9"              = "9"
    "num_10"             = "10 yards!"
    "num_20"             = "20 yards!"
    "num_30"             = "30 yards!"
    "num_40"             = "40 yards!"
    "num_50"             = "50 yards!"
    "num_60"             = "60 yards!"
    "num_100"            = "One hundred yards!"
    "num_200"            = "Two hundred yards!"
    "num_300"            = "Three hundred yards!"
    "num_400"            = "Four hundred yards!"
    "num_120"            = "One hundred and twenty yards!"
    "monster_drive_biggest" = "Monster drive time! Luka, tap the club with the biggest number of yards!"
    "hundreds_train_prompt" = "All aboard the golf train! Count by hundreds: what comes next?"
    "bridge_tens_30"     = "Count by tens across the bridge! Which stone goes in the empty spot?"
    "bridge_tens_40"     = "Count by tens across the bridge! Which stone goes in the empty spot?"
    "bridge_tens_50"     = "Count by tens across the bridge! Which stone goes in the empty spot?"
    "bridge_tens_60"     = "Count by tens across the bridge! Which stone goes in the empty spot?"
    "fill_box_4_to_6"    = "Look at the golf box! There are 4 balls inside. Tap the empty spaces: how many more balls do we need to make 6?"
    "fill_box_3_to_5"    = "Look at the golf box! There are 3 balls inside. Tap the empty spaces: how many more balls do we need to make 5?"
    "fill_box_5_to_7"    = "Look at the golf box! There are 5 balls inside. Tap the empty spaces: how many more balls do we need to make 7?"
    "fill_box_4_to_8"    = "Look at the golf box! There are 4 balls inside. Tap the empty spaces: how many more balls do we need to make 8?"
    "fill_box_6_to_9"    = "Look at the golf box! There are 6 balls inside. Tap the empty spaces: how many more balls do we need to make 9?"
    "dr_exact_234"       = "Target practice! Luka, find two hundred and thirty-four yards!"
    "dr_exact_127"       = "Target practice! Luka, find one hundred and twenty-seven yards!"
    "dr_exact_345"       = "Target practice! Luka, find three hundred and forty-five yards!"
    "dr_exact_182"       = "Target practice! Luka, find one hundred and eighty-two yards!"
    "dr_exact_269"       = "Target practice! Luka, find two hundred and sixty-nine yards!"
    "dr_exact_415"       = "Target practice! Luka, find four hundred and fifteen yards!"
    "dr_ans_234"         = "Two hundred and thirty-four yards!"
    "dr_ans_127"         = "One hundred and twenty-seven yards!"
    "dr_ans_345"         = "Three hundred and forty-five yards!"
    "dr_ans_182"         = "One hundred and eighty-two yards!"
    "dr_ans_269"         = "Two hundred and sixty-nine yards!"
    "dr_ans_415"         = "Four hundred and fifteen yards!"
    "dr_try_again"       = "Bonk! Bounced off the target sign! Try that one again, Luka!"
    "mg_try_again"       = "Boing! Bounced off the obstacle! Try the equation again!"
    "streak_3"           = "Awesome! 3 in a row! Volcano fireworks!"
    "streak_6"           = "Incredible! 6 in a row! Volcano fireworks!"
    "streak_9"           = "Unstoppable! 9 in a row! Volcano fireworks!"
    "num_150"            = "One hundred and fifty yards!"
    "num_160"            = "One hundred and sixty yards!"
    "num_170"            = "One hundred and seventy yards!"
    "num_240"            = "Two hundred and forty yards!"
    "num_250"            = "Two hundred and fifty yards!"
    "num_260"            = "Two hundred and sixty yards!"
    "num_290"            = "Two hundred and ninety yards!"
    "num_310"            = "Three hundred and ten yards!"
    "num_350"            = "Three hundred and fifty yards!"
    "num_380"            = "Three hundred and eighty yards!"
    "num_410"            = "Four hundred and ten yards!"
    "num_420"            = "Four hundred and twenty yards!"
    "find_driver_120"    = "Luka, find the 120-yard driver!"
    "find_driver_150"    = "Luka, find the 150-yard driver!"
    "find_driver_160"    = "Luka, find the 160-yard driver!"
    "find_driver_170"    = "Luka, find the 170-yard driver!"
    "find_driver_250"    = "Luka, find the 250-yard driver!"
    "find_driver_260"    = "Luka, find the 260-yard driver!"
    "find_driver_290"    = "Luka, find the 290-yard driver!"
    "find_driver_310"    = "Luka, find the 310-yard driver!"
    "find_driver_350"    = "Luka, find the 350-yard driver!"
    "find_driver_380"    = "Luka, find the 380-yard driver!"
    "find_driver_410"    = "Luka, find the 410-yard driver!"
    "find_driver_420"    = "Luka, find the 420-yard driver!"
    "approach_20"        = "Approach shot! 20 yards to the green. Tap the plus ten blocks to count up to 20!"
    "approach_30"        = "Approach shot! 30 yards to the green. Tap the plus ten blocks to count up to 30!"
    "approach_40"        = "Approach shot! 40 yards to the green. Tap the plus ten blocks to count up to 40!"
    "approach_50"        = "Approach shot! 50 yards to the green. Tap the plus ten blocks to count up to 50!"
    "approach_60"        = "Approach shot! 60 yards to the green. Tap the plus ten blocks to count up to 60!"
    "putt_2_plus_2"      = "Putting time! Count the golf balls: what is 2 plus 2 feet?"
    "putt_eq_2_2_4"      = "2 plus 2 equals 4 feet!"
    "putt_3_plus_2"      = "Putting time! Count the golf balls: what is 3 plus 2 feet?"
    "putt_eq_3_2_5"      = "3 plus 2 equals 5 feet!"
    "putt_4_plus_2"      = "Putting time! Count the golf balls: what is 4 plus 2 feet?"
    "putt_eq_4_2_6"      = "4 plus 2 equals 6 feet!"
    "putt_2_plus_1"      = "Putting time! Count the golf balls: what is 2 plus 1 feet?"
    "putt_eq_2_1_3"      = "2 plus 1 equals 3 feet!"
    "putt_4_plus_3"      = "Putting time! Count the golf balls: what is 4 plus 3 feet?"
    "putt_eq_4_3_7"      = "4 plus 3 equals 7 feet!"
}

$wc = New-Object System.Net.WebClient
$wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

$count = 0
foreach ($kv in $clips.GetEnumerator()) {
    $file = Join-Path $outDir "$($kv.Key).mp3"
    if (-not (Test-Path $file)) {
        $q = [System.Uri]::EscapeDataString($kv.Value)
        $url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=$q"
        try {
            $bytes = $wc.DownloadData($url)
            if ($bytes.Length -gt 500) {
                [System.IO.File]::WriteAllBytes($file, $bytes)
                $count++
            }
        } catch {
            Write-Warning "Failed $($kv.Key): $_"
        }
    }
}
Write-Host "Generated $count natural neural MP3 clips in $outDir"
