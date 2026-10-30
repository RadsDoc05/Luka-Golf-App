extends CanvasLayer

# MathModal.gd - Accessible Large-Button Calculator, Place-Value TTS, and Car Counting Celebration

signal math_completed(is_success: bool)

@onready var modal_container: Control = $ModalContainer
@onready var equation_label: Label = $ModalContainer/Card/EquationLabel
@onready var input_display: Label = $ModalContainer/Card/InputDisplay
@onready var feedback_label: Label = $ModalContainer/Card/FeedbackLabel
@onready var number_grid: GridContainer = $ModalContainer/Card/NumberGrid
@onready var tts_btn: Button = $ModalContainer/Card/TTSButton
@onready var close_btn: Button = $ModalContainer/Card/CloseButton
@onready var car_stage: Control = $ModalContainer/Card/CarStage

var current_equation: Dictionary = {}
var entered_text: String = ""
var is_celebrating: bool = false

func _ready() -> void:
	visible = false
	tts_btn.pressed.connect(_on_tts_pressed)
	close_btn.pressed.connect(_on_close_pressed)
	_setup_keypad()

func open_challenge() -> void:
	is_celebrating = false
	entered_text = ""
	input_display.text = "_"
	feedback_label.text = ""
	feedback_label.modulate = Color.WHITE
	_clear_cars()

	# Generate new equation based on Luka's adaptive learning level
	current_equation = MathEngine.generate_equation()
	equation_label.text = current_equation.get("display", "1 + 1 = ?")
	visible = true

	# Speak prompt
	var prompt = current_equation.get("prompt_spoken", "")
	if not prompt.is_empty():
		MathEngine.speak(prompt)

func _setup_keypad() -> void:
	# Connect keypad buttons dynamically
	for child in number_grid.get_children():
		if child is Button:
			child.pressed.connect(_on_key_pressed.bind(child.text))

func _on_key_pressed(key: String) -> void:
	if is_celebrating:
		return

	if key == "CLEAR" or key == "C":
		entered_text = ""
		input_display.text = "_"
		feedback_label.text = ""
	elif key == "GO" or key == "✓" or key == "ENTER":
		_check_answer()
	else:
		if entered_text.length() < 5:
			entered_text += key
			input_display.text = entered_text
			# Immediate audio confirmation for place-value learning
			MathEngine.speak(key)

func _check_answer() -> void:
	if entered_text.is_empty():
		return

	var user_val = int(entered_text)
	var expected_ans = int(current_equation.get("answer", -999))

	if user_val == expected_ans:
		# Success!
		is_celebrating = true
		feedback_label.text = "🎉 AWESOME JOB, LUKA! 🎉"
		feedback_label.modulate = Color(0.2, 1.0, 0.3)
		MathEngine.record_answer(true)
		GameManager.activate_mega_drive()

		# Read full equation out loud (natural pronunciation)
		var full_speech = current_equation.get("full_spoken", "")
		MathEngine.speak(full_speech)

		# Trigger visual car counting celebration
		_start_car_celebration(expected_ans)
	else:
		# Helpful feedback
		feedback_label.text = "Almost! Tap Clear to try again."
		feedback_label.modulate = Color(1.0, 0.4, 0.4)
		MathEngine.record_answer(false)
		MathEngine.speak("Almost! Try counting again.")

func _start_car_celebration(target_count: int) -> void:
	_clear_cars()
	var count_to_show = min(target_count, 100)
	var is_hero_mode = target_count > 100

	if is_hero_mode:
		# Giant Hero Car for numbers > 100
		var hero_car = TextureRect.new()
		hero_car.texture = preload("res://assets/car.png")
		hero_car.custom_minimum_size = Vector2(160, 90)
		hero_car.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		hero_car.position = Vector2(180, 20)
		car_stage.add_child(hero_car)

		var badge = Label.new()
		badge.text = str(target_count)
		badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		badge.position = Vector2(350, 35)
		badge.add_theme_font_size_override("font_size", 36)
		badge.modulate = Color(1.0, 0.85, 0.1)
		car_stage.add_child(badge)

		await get_tree().create_timer(2.4).timeout
		_finish_modal(true)
	else:
		# Count up with cars driving across
		var delay = 0.22 if count_to_show <= 10 else (1.8 / float(count_to_show))
		for i in range(1, count_to_show + 1):
			_spawn_celebration_car(i)
			await get_tree().create_timer(delay).timeout

		await get_tree().create_timer(1.2).timeout
		_finish_modal(true)

func _spawn_celebration_car(num: int) -> void:
	var car_container = HBoxContainer.new()
	var car_img = TextureRect.new()
	car_img.texture = preload("res://assets/car.png")
	car_img.custom_minimum_size = Vector2(56, 32)
	car_img.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL

	var num_label = Label.new()
	num_label.text = str(num)
	num_label.add_theme_font_size_override("font_size", 18)
	num_label.modulate = Color(1.0, 0.9, 0.2)

	car_container.add_child(car_img)
	car_container.add_child(num_label)

	var start_x = -80.0
	var target_x = 20.0 + ((num - 1) % 6) * 95.0
	var lane_y = 10.0 + int((num - 1) / 6.0) * 38.0

	car_container.position = Vector2(start_x, lane_y)
	car_stage.add_child(car_container)

	var tween = create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(car_container, "position:x", target_x, 0.35)

func _clear_cars() -> void:
	for child in car_stage.get_children():
		child.queue_free()

func _finish_modal(success: bool) -> void:
	visible = false
	emit_signal("math_completed", success)

func _on_tts_pressed() -> void:
	var prompt = current_equation.get("prompt_spoken", "")
	if not prompt.is_empty():
		MathEngine.speak(prompt)

func _on_close_pressed() -> void:
	_finish_modal(false)
