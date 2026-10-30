extends Node2D

# Main.gd - Master Controller Orchestrating Physics Course, Ball, HUD, and Math Challenges

@onready var course: Node2D = $Course
@onready var ball: RigidBody2D = $Ball
@onready var hud: CanvasLayer = $HUD
@onready var math_modal: CanvasLayer = $MathModal
@onready var celebration_layer: CanvasLayer = $CelebrationLayer
@onready var celebration_banner: Label = $CelebrationLayer/Banner

func _ready() -> void:
	celebration_layer.visible = false
	course.register_ball(ball)

	# Connect Signals
	hud.restart_hole_pressed.connect(_on_restart_hole)
	hud.open_math_pressed.connect(_on_open_math)
	math_modal.math_completed.connect(_on_math_completed)
	ball.ball_stopped.connect(_on_ball_stopped)
	GameManager.hole_completed.connect(_on_hole_completed)

	# Start by offering an initial math boost challenge!
	get_tree().create_timer(0.6).timeout.connect(func():
		math_modal.open_challenge()
	)

func _on_restart_hole() -> void:
	celebration_layer.visible = false
	GameManager.reset_hole()
	ball.reset_position(course.tee_marker.global_position)

func _on_open_math() -> void:
	math_modal.open_challenge()

func _on_math_completed(success: bool) -> void:
	if success:
		# Flash notification
		pass

func _on_ball_stopped() -> void:
	var dist_to_cup = ball.global_position.distance_to(course.cup_area.global_position)
	if dist_to_cup > 35.0:
		# Track if putting on green
		if dist_to_cup < 300.0:
			GameManager.consecutive_putt_misses += 1

func _on_hole_completed(hole_num: int, strokes: int, par: int) -> void:
	celebration_layer.visible = true
	var rating = "GREAT SHOT!"
	if strokes == 1:
		rating = "🌟 HOLE IN ONE! 🌟"
	elif strokes <= par:
		rating = "🎯 BIRDIE / PAR! 🎯"

	celebration_banner.text = "%s\nCompleted in %d strokes!" % [rating, strokes]

	var speech = "%s Hole %d completed in %s strokes!" % [rating, hole_num, MathEngine.number_to_words(strokes)]
	MathEngine.speak(speech)

	await get_tree().create_timer(3.0).timeout
	# Prompt next math challenge
	celebration_layer.visible = false
	_on_restart_hole()
	math_modal.open_challenge()
