extends CanvasLayer

# HUD.gd - Accessible Top Bar with Hole Info, Strokes, and Centered Mega Drive Boost Button

signal restart_hole_pressed()
signal open_math_pressed()

@onready var hole_title_label: Label = $TopBar/HoleTitle
@onready var stroke_label: Label = $TopBar/StrokeCount
@onready var mega_btn: Button = $TopBar/MegaButton
@onready var restart_btn: Button = $TopBar/RestartButton

func _ready() -> void:
	GameManager.shot_taken.connect(_on_shot_taken)
	GameManager.mega_drive_status_changed.connect(_on_mega_drive_status_changed)
	mega_btn.pressed.connect(_on_mega_btn_pressed)
	restart_btn.pressed.connect(_on_restart_btn_pressed)

	_update_hud()

func _update_hud() -> void:
	hole_title_label.text = "⛳ Hole %d: %s (Par %d)" % [GameManager.current_hole, GameManager.hole_name, GameManager.par]
	stroke_label.text = "Strokes: %d" % GameManager.strokes
	_on_mega_drive_status_changed(GameManager.is_mega_drive_active)

func _on_shot_taken(strokes: int) -> void:
	stroke_label.text = "Strokes: %d" % strokes

func _on_mega_drive_status_changed(active: bool) -> void:
	if active:
		mega_btn.text = "⚡ MEGA SHOT ACTIVE! (2.2x Power)"
		mega_btn.modulate = Color(1.0, 0.85, 0.1)
	else:
		mega_btn.text = "⭐ SOLVE MATH FOR MEGA DRIVE!"
		mega_btn.modulate = Color(0.2, 0.85, 1.0)

func _on_mega_btn_pressed() -> void:
	emit_signal("open_math_pressed")

func _on_restart_btn_pressed() -> void:
	emit_signal("restart_hole_pressed")
