extends Node

# MathEngine.gd - Adaptive Golf Math Engine & TTS for Luka's Golf Adventure
# Handles procedural equations, concrete visual representation, and natural place-value pronunciation.

const ONES_WORDS = [
	"", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
	"ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
	"seventeen", "eighteen", "nineteen"
]

const TENS_WORDS = [
	"", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"
]

var preferred_voice: String = ""
var tts_available: bool = false
var adaptive_streak: int = 0
var adaptive_difficulty: String = "kindergarten" # "kindergarten", "grade1", "grade2"

func _ready() -> void:
	if DisplayServer.has_feature(DisplayServer.FEATURE_TEXT_TO_SPEECH):
		tts_available = true
		var voices = DisplayServer.tts_get_voices()
		for v in voices:
			var v_id = v.get("id", "")
			var v_lang = v.get("language", "")
			if "en" in v_lang.to_lower() or "us" in v_lang.to_lower():
				preferred_voice = v_id
				break
		if preferred_voice.is_empty() and voices.size() > 0:
			preferred_voice = voices[0].get("id", "")

## Converts any integer up to millions into natural spoken English
func number_to_words(num: int) -> String:
	if num == 0:
		return "Zero"
	if num < 0:
		return "Negative " + _helper_number_to_words(abs(num))
	var result = _helper_number_to_words(num).strip_edges()
	if result.length() > 0:
		return result.capitalize()
	return str(num)

func _helper_number_to_words(val: int) -> String:
	if val < 20:
		return ONES_WORDS[val]
	if val < 100:
		var tens = int(val / 10)
		var ones = val % 10
		if ones > 0:
			return TENS_WORDS[tens] + "-" + ONES_WORDS[ones]
		return TENS_WORDS[tens]
	if val < 1000:
		var h = int(val / 100)
		var rem = val % 100
		var h_part = ONES_WORDS[h] + " hundred"
		if rem == 0:
			return h_part
		return h_part + " and " + _helper_number_to_words(rem)
	if val < 1000000:
		var th = int(val / 1000)
		var rem = val % 1000
		var th_part = _helper_number_to_words(th) + " thousand"
		if rem == 0:
			return th_part
		if rem < 100:
			return th_part + " and " + _helper_number_to_words(rem)
		return th_part + " " + _helper_number_to_words(rem)
	if val < 1000000000:
		var m = int(val / 1000000)
		var rem = val % 1000000
		var m_part = _helper_number_to_words(m) + " million"
		if rem == 0:
			return m_part
		if rem < 100:
			return m_part + " and " + _helper_number_to_words(rem)
		return m_part + " " + _helper_number_to_words(rem)
	return str(val)

## Generates an age-appropriate equation based on adaptive performance
func generate_equation(difficulty: String = "", allow_missing: bool = true) -> Dictionary:
	var diff = difficulty if difficulty != "" else adaptive_difficulty
	var op = "+"
	var a = 1
	var b = 1
	var ans = 2
	var is_missing = false

	# Adaptive selection
	if diff == "kindergarten":
		# Add sums up to 10, or simple 1-digit subtractions
		if randf() > 0.35:
			a = randi_range(1, 6)
			b = randi_range(1, 5)
			ans = a + b
			op = "+"
		else:
			ans = randi_range(1, 5)
			b = randi_range(1, 4)
			a = ans + b
			op = "-"
	elif diff == "grade1":
		# Sums up to 20, missing addends
		if allow_missing and randf() > 0.5:
			is_missing = true
			a = randi_range(2, 9)
			ans = randi_range(1, 9) # the missing piece
			b = ans
			op = "+"
		elif randf() > 0.4:
			a = randi_range(4, 12)
			b = randi_range(2, 8)
			ans = a + b
			op = "+"
		else:
			a = randi_range(7, 18)
			b = randi_range(2, a - 2)
			ans = a - b
			op = "-"
	else: # grade2+
		# 2-digit sums or doubles
		a = randi_range(10, 25)
		b = randi_range(5, 15)
		ans = a + b
		op = "+"

	var text_display = ""
	var prompt_spoken = ""
	var full_spoken = ""

	if is_missing:
		text_display = "%d %s [ ? ] = %d" % [a, op, a + ans]
		prompt_spoken = "%s %s what equals %s?" % [number_to_words(a), "plus" if op == "+" else "minus", number_to_words(a + ans)]
		full_spoken = "%s %s %s equals %s!" % [number_to_words(a), "plus" if op == "+" else "minus", number_to_words(ans), number_to_words(a + ans)]
	else:
		text_display = "%d %s %d = ?" % [a, op, b]
		prompt_spoken = "%s %s %s equals what?" % [number_to_words(a), "plus" if op == "+" else "minus", number_to_words(b)]
		full_spoken = "%s %s %s equals %s!" % [number_to_words(a), "plus" if op == "+" else "minus", number_to_words(b), number_to_words(ans)]

	return {
		"operand_a": a,
		"operand_b": b,
		"operator": op,
		"answer": ans,
		"is_missing": is_missing,
		"display": text_display,
		"prompt_spoken": prompt_spoken,
		"full_spoken": full_spoken
	}

## Records player answer to dynamically tune difficulty
func record_answer(is_correct: bool) -> void:
	if is_correct:
		adaptive_streak += 1
		if adaptive_streak >= 5 and adaptive_difficulty == "kindergarten":
			adaptive_difficulty = "grade1"
		elif adaptive_streak >= 12 and adaptive_difficulty == "grade1":
			adaptive_difficulty = "grade2"
	else:
		adaptive_streak = max(0, adaptive_streak - 2)
		if adaptive_streak == 0 and adaptive_difficulty == "grade2":
			adaptive_difficulty = "grade1"
		elif adaptive_streak == 0 and adaptive_difficulty == "grade1":
			adaptive_difficulty = "kindergarten"

## Reads aloud a message using high-quality local TTS
func speak(text: String) -> void:
	if not tts_available:
		return
	DisplayServer.tts_stop()
	DisplayServer.tts_speak(text, preferred_voice, 50, 1.0, 1.0)
