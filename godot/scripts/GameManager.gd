extends Node

# GameManager.gd - Coordinates game states, scoring, adaptive assists, and mode transitions

signal shot_taken(stroke_count: int)
signal ball_sunk()
signal hole_completed(hole_number: int, strokes: int, par: int)
signal mega_drive_status_changed(is_active: bool)
signal request_math_modal(mode: String)

var current_hole: int = 1
var strokes: int = 0
var par: int = 3
var hole_name: String = "Coconut Kickoff"
var is_mega_drive_active: bool = false
var consecutive_putt_misses: int = 0

func reset_hole() -> void:
	strokes = 0
	is_mega_drive_active = false
	consecutive_putt_misses = 0
	emit_signal("mega_drive_status_changed", false)
	emit_signal("shot_taken", strokes)

func record_stroke() -> void:
	strokes += 1
	emit_signal("shot_taken", strokes)

func activate_mega_drive() -> void:
	is_mega_drive_active = true
	emit_signal("mega_drive_status_changed", true)

func consume_mega_drive() -> bool:
	var was_active = is_mega_drive_active
	is_mega_drive_active = false
	emit_signal("mega_drive_status_changed", false)
	return was_active

## Adaptive Cup Magnet: Expands cup gravity if Luka has taken multiple putts on the same green
func get_adaptive_cup_assist_radius() -> float:
	# Base radius 28px. If missed 2+ putts, smoothly increases to 45px to assist!
	if consecutive_putt_misses >= 3:
		return 50.0
	elif consecutive_putt_misses >= 2:
		return 38.0
	return 26.0

func notify_ball_sunk() -> void:
	emit_signal("ball_sunk")
	emit_signal("hole_completed", current_hole, strokes, par)
